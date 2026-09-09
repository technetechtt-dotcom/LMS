import { mkdir, mkdtemp, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { createHmac } from 'crypto';
import { FileStorageService } from './file-storage.service';

describe('FileStorageService verified local lifecycle', () => {
  let root: string;
  let current: Record<string, unknown> | null;
  let prisma: {
    uploadRecord: {
      create: jest.Mock;
      update: jest.Mock;
      findUnique: jest.Mock;
      findFirst: jest.Mock;
      findMany: jest.Mock;
    };
  };
  let service: FileStorageService;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'skillforge-upload-'));
    current = null;
    prisma = {
      uploadRecord: {
        create: jest.fn().mockImplementation(({ data }) => {
          current = { id: 'upload-1', ...data };
          return current;
        }),
        update: jest.fn().mockImplementation(({ data }) => {
          current = { ...current, ...data };
          return current;
        }),
        findUnique: jest.fn().mockImplementation(() => current),
        findFirst: jest.fn().mockImplementation((query) => {
          if (query?.select?.status) return current;
          return current?.status === 'VERIFIED' ? { id: 'upload-1' } : null;
        }),
        findMany: jest.fn().mockResolvedValue([]),
      },
    };
    const values: Record<string, string> = {
      NODE_ENV: 'test',
      UPLOAD_DIR: root,
      UPLOAD_MAX_MB: '2',
      UPLOAD_RETENTION_DAYS: '30',
      JWT_SECRET: 'unit-test-storage-secret',
      API_PUBLIC_URL: 'http://api.example.test',
    };
    service = new FileStorageService(
      { get: jest.fn((key: string) => values[key]) } as never,
      prisma as never,
    );
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it('quarantines, scans and only then reports a verified upload', async () => {
    const stored = await service.upload(
      'learner evidence.pdf',
      Buffer.from('clean evidence'),
      'application/pdf',
      { prefix: 'poe', organisationId: 'organisation-1' },
    );

    expect(stored).toEqual(
      expect.objectContaining({
        uploadId: 'upload-1',
        status: 'VERIFIED',
        provider: 'local',
        sha256: expect.stringMatching(/^[a-f0-9]{64}$/),
      }),
    );
    expect(prisma.uploadRecord.update.mock.calls.map((call) => call[0].data.status)).toEqual([
      'SCANNING',
      'VERIFIED',
    ]);
    expect(current).toEqual(
      expect.objectContaining({
        status: 'VERIFIED',
        quarantineKey: null,
        storageKey: stored.key,
        verifiedAt: expect.any(Date),
      }),
    );

    await expect(
      service.assertValidStorageKey(stored.key, 'organisation-1'),
    ).resolves.toBe(stored.key);
    await expect(service.getUploadState('upload-1', 'organisation-1')).resolves.toEqual(
      expect.objectContaining({ status: 'VERIFIED' }),
    );

    const url = await service.getSignedDownloadUrl(stored.key, 60);
    const download = await service.openDownload(url.split('/storage/')[1]);
    expect(download).toEqual(
      expect.objectContaining({
        mimeType: 'application/pdf',
        fileName: 'learner evidence.pdf',
        size: Buffer.byteLength('clean evidence'),
      }),
    );
    download.stream.destroy();
  });

  it('rejects malware test content and never promotes it', async () => {
    await expect(
      service.upload(
        'unsafe.txt',
        Buffer.from('EICAR-STANDARD-ANTIVIRUS-TEST-FILE'),
        'text/plain',
        { prefix: 'poe', organisationId: 'organisation-1' },
      ),
    ).rejects.toThrow('rejected by malware scanning');
    expect(current).toEqual(expect.objectContaining({ status: 'REJECTED' }));
    expect(current?.storageKey).toBeUndefined();
  });

  it('rejects empty, oversized and non-issued keys', async () => {
    await expect(
      service.upload('empty.pdf', Buffer.alloc(0), 'application/pdf'),
    ).rejects.toThrow('Empty files');
    await expect(
      service.upload('large.pdf', Buffer.alloc(2 * 1024 * 1024 + 1), 'application/pdf'),
    ).rejects.toThrow('exceeds 2MB');
    await expect(
      service.assertValidStorageKey('../secret', 'organisation-1'),
    ).rejects.toThrow('Invalid storageKey');
    await expect(
      service.assertValidStorageKey('unknown/organisation-1/a', 'organisation-1'),
    ).rejects.toThrow('server-issued');
    await expect(
      service.assertValidStorageKey('poe/organisation-1/not-recorded.pdf', 'organisation-1'),
    ).rejects.toThrow('not a verified upload');
  });

  it('fails closed on local storage in production', async () => {
    const production = new FileStorageService(
      {
        get: jest.fn((key: string) =>
          key === 'NODE_ENV' ? 'production' : key === 'UPLOAD_MAX_MB' ? '2' : undefined,
        ),
      } as never,
      prisma as never,
    );
    await expect(
      production.upload('evidence.pdf', Buffer.from('clean'), 'application/pdf'),
    ).rejects.toThrow('Durable object storage is required');
    expect(prisma.uploadRecord.create).not.toHaveBeenCalled();
  });

  it('rejects tampered download tokens and unknown upload states', async () => {
    await expect(service.openDownload('not-a-valid-token')).rejects.toThrow(
      'Invalid download token',
    );
    prisma.uploadRecord.findFirst.mockResolvedValueOnce(null);
    await expect(service.getUploadState('missing', 'organisation-1')).rejects.toThrow(
      'Upload not found',
    );
  });

  it('accepts only server-issued keys owned by the active organisation', async () => {
    current = { id: 'upload-1', status: 'VERIFIED' };
    await expect(service.assertValidStorageKey(
      'storage://local/poe/organisation-1/generated.pdf',
      'organisation-1',
    )).resolves.toBe('poe/organisation-1/generated.pdf');

    const production = new FileStorageService(
      { get: jest.fn((key: string) => key === 'NODE_ENV' ? 'production' : undefined) } as never,
      prisma as never,
    );
    await expect(production.assertValidStorageKey(
      'poe/another-organisation/generated.pdf',
      'organisation-1',
    )).rejects.toThrow('active organisation');
  });

  it('rejects missing, absent and empty staged upload parts', async () => {
    await expect(service.uploadStaged(undefined)).rejects.toThrow('A file is required');
    await expect(service.uploadStaged({
      path: join(root, 'quarantine', 'incoming', 'missing'),
      originalname: 'missing.pdf',
      mimetype: 'application/pdf',
    } as never)).rejects.toThrow('Empty files');
    const empty = join(root, 'quarantine', 'incoming', 'empty');
    await mkdir(join(root, 'quarantine', 'incoming'), { recursive: true });
    await writeFile(empty, Buffer.alloc(0));
    await expect(service.uploadStaged({
      path: empty, originalname: 'empty.pdf', mimetype: 'application/pdf',
    } as never)).rejects.toThrow('Empty files');
    await expect(service.discardStaged(undefined)).resolves.toBeUndefined();
    await expect(service.discardStaged({
      path: join(root, 'outside'), originalname: 'bad.pdf', mimetype: 'application/pdf',
    } as never)).resolves.toBeUndefined();
  });

  it('proves local read/write/delete readiness outside production', async () => {
    await expect(service.readinessProbe()).resolves.toEqual({
      ok: true, provider: 'local', versionRecovery: false,
    });
    await expect(service.scannerAvailability()).resolves.toEqual({
      ok: true, mode: 'development-signature-scan',
    });
  });

  it('fails closed for every malformed, expired and unavailable local download token', async () => {
    const sign = (body: string) => `${body}.${createHmac('sha256', 'unit-test-storage-secret')
      .update(body).digest('base64url')}`;
    const encoded = (payload: unknown) => Buffer.from(JSON.stringify(payload)).toString('base64url');

    await expect(service.openDownload('a.b')).rejects.toThrow('Invalid download token');
    await expect(service.openDownload(sign(Buffer.from('not-json').toString('base64url'))))
      .rejects.toThrow('Invalid download token');
    await expect(service.openDownload(sign(encoded({ k: 'poe/file.pdf' }))))
      .rejects.toThrow('Invalid download token');
    await expect(service.openDownload(sign(encoded({
      k: 'poe/file.pdf', exp: Math.floor(Date.now() / 1000) - 1,
    })))).rejects.toThrow('Download link expired');

    current = { status: 'REJECTED' };
    await expect(service.openDownload(sign(encoded({
      k: 'poe/file.pdf', exp: Math.floor(Date.now() / 1000) + 60,
    })))).rejects.toThrow('Upload is not verified');
    current = null;
    await expect(service.openDownload(sign(encoded({
      k: 'poe/missing.pdf', exp: Math.floor(Date.now() / 1000) + 60,
    })))).rejects.toThrow('File not found');
  });

  it('purges expired local objects and retains an auditable failure state', async () => {
    const stored = await service.upload(
      'expired.txt', Buffer.from('old evidence'), 'text/plain',
      { prefix: 'poe', organisationId: 'organisation-1' },
    );
    prisma.uploadRecord.findMany.mockResolvedValueOnce([{
      id: 'upload-1', storageKey: stored.key, quarantineKey: null,
    }]);
    await expect(service.purgeExpired(0, 'organisation-1')).resolves.toEqual({
      examined: 1, purged: 1,
    });
    expect(prisma.uploadRecord.update).toHaveBeenLastCalledWith({
      where: { id: 'upload-1' },
      data: { status: 'PURGED', storageKey: null, quarantineKey: null, failureReason: null },
    });

    prisma.uploadRecord.findMany.mockResolvedValueOnce([{
      id: 'failed-purge', storageKey: '../outside', quarantineKey: null,
    }]);
    await expect(service.purgeExpired()).resolves.toEqual({ examined: 1, purged: 0 });
  });
});
