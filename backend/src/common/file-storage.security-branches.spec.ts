import { mkdir, mkdtemp, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { FileStorageService } from './file-storage.service';

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn().mockResolvedValue('https://signed.example.test/object'),
}));

describe('FileStorageService production security branches', () => {
  let root: string;
  let current: Record<string, unknown> | null;
  let values: Record<string, string>;
  let prisma: Record<string, any>;
  let send: jest.Mock;
  let service: FileStorageService;
  const originalFetch = global.fetch;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'skillforge-storage-security-'));
    await mkdir(join(root, 'quarantine', 'incoming'), { recursive: true });
    current = null;
    values = {
      NODE_ENV: 'production',
      UPLOAD_DIR: root,
      UPLOAD_MAX_MB: '2',
      UPLOAD_RETENTION_DAYS: '30',
      FILE_SIGNING_SECRET: 'file-signing-secret-at-least-32-characters',
      OBJECT_STORAGE_ENDPOINT: 'https://objects.example.test',
      OBJECT_STORAGE_BUCKET: 'private-evidence',
      OBJECT_STORAGE_REGION: 'test-1',
      OBJECT_STORAGE_ACCESS_KEY_ID: 'access-key',
      OBJECT_STORAGE_SECRET_ACCESS_KEY: 'secret-key',
      MALWARE_SCAN_URL: 'https://scanner.example.test/scan',
      MALWARE_SCAN_HEALTH_URL: 'https://scanner.example.test/health',
      MALWARE_SCAN_TOKEN: 'scanner-token',
    };
    const uploadRecord = {
      create: jest.fn().mockImplementation(({ data }) => {
        current = { id: 'upload-1', ...data };
        return current;
      }),
      update: jest.fn().mockImplementation(({ data }) => {
        current = { ...current, ...data };
        return current;
      }),
      findUnique: jest.fn().mockImplementation(() => current),
      findFirst: jest.fn().mockImplementation(() => current),
      findMany: jest.fn().mockResolvedValue([]),
    };
    prisma = {
      uploadRecord,
      auditLog: { create: jest.fn().mockResolvedValue({}) },
      $transaction: jest.fn((operations: Array<Promise<unknown>>) => Promise.all(operations)),
    };
    send = jest.fn().mockImplementation(async (command) => {
      const name = command.constructor.name;
      if (name === 'PutObjectCommand' && command.input?.Body
        && typeof command.input.Body[Symbol.asyncIterator] === 'function') {
        for await (const _chunk of command.input.Body) {
          // The real S3 client resolves only after consuming the upload stream.
        }
      }
      if (name === 'GetBucketVersioningCommand') return { Status: 'Enabled' };
      if (name === 'GetObjectCommand') {
        return { Body: { transformToByteArray: jest.fn().mockResolvedValue(Buffer.from('readiness')) } };
      }
      if (name === 'ListObjectVersionsCommand') {
        return {
          Versions: [
            { Key: 'poe/organisation-1/evidence.pdf', VersionId: 'older', LastModified: new Date('2025-01-01') },
            { Key: 'poe/organisation-1/evidence.pdf', VersionId: 'latest', LastModified: new Date('2026-01-01') },
            { Key: 'another-key', VersionId: 'ignore', LastModified: new Date('2027-01-01') },
          ],
        };
      }
      return {};
    });
    service = new FileStorageService(
      { get: jest.fn((key: string) => values[key]) } as never,
      prisma as never,
    );
    (service as unknown as { s3Client: { send: jest.Mock } }).s3Client = { send };
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({ clean: true, details: 'scanner-clean' }),
    }) as never;
  });

  afterEach(async () => {
    global.fetch = originalFetch;
    await rm(root, { recursive: true, force: true });
    jest.clearAllMocks();
  });

  it('streams server-generated and staged files through S3 quarantine and scanning', async () => {
    const generated = await service.upload(
      'certificate.pdf', Buffer.from('%PDF-clean'), 'application/pdf',
      { prefix: '/certificates/', organisationId: 'organisation-1', uploadedById: 'admin-1' },
    );
    expect(generated).toEqual(expect.objectContaining({
      provider: 's3', bucket: 'private-evidence', status: 'VERIFIED',
    }));
    expect(send.mock.calls.map(([command]) => command.constructor.name)).toEqual(
      expect.arrayContaining(['PutObjectCommand', 'CopyObjectCommand', 'DeleteObjectCommand']),
    );
    expect(global.fetch).toHaveBeenCalledWith(
      'https://scanner.example.test/scan',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer scanner-token' }),
      }),
    );

    const path = join(root, 'quarantine', 'incoming', 'part-one');
    await writeFile(path, Buffer.from('%PDF-staged'));
    const staged = await service.uploadStaged({
      path, originalname: 'evidence.pdf', mimetype: 'application/pdf', size: 12,
    } as never, { prefix: 'poe', organisationId: 'organisation-1' });
    expect(staged.provider).toBe('s3');
  });

  it('records scanner rejection and provider failures without promoting objects', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValue({ clean: false }),
    });
    await expect(service.upload(
      'unsafe.txt', Buffer.from('unsafe'), 'text/plain',
      { organisationId: 'organisation-1' },
    )).rejects.toThrow('rejected by malware scanning');
    expect(current).toEqual(expect.objectContaining({ status: 'REJECTED' }));

    send.mockRejectedValueOnce('provider failed');
    await expect(service.upload(
      'failed.txt', Buffer.from('clean'), 'text/plain',
      { organisationId: 'organisation-1' },
    )).rejects.toBe('provider failed');
    expect(current).toEqual(expect.objectContaining({
      status: 'FAILED', failureReason: 'provider failed',
    }));
  });

  it('fails scanner calls closed and reports remote scanner health', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false, status: 502 });
    await expect(service.upload(
      'failed.txt', Buffer.from('clean'), 'text/plain',
      { organisationId: 'organisation-1' },
    )).rejects.toThrow('Malware scanner failed');

    await expect(service.scannerAvailability()).resolves.toEqual({ ok: true, mode: 'remote' });
    expect(global.fetch).toHaveBeenLastCalledWith(
      'https://scanner.example.test/health',
      expect.objectContaining({ headers: { Authorization: 'Bearer scanner-token' } }),
    );
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false, status: 503 });
    await expect(service.scannerAvailability()).rejects.toThrow('returned 503');
    delete values.MALWARE_SCAN_HEALTH_URL;
    await expect(service.scannerAvailability()).rejects.toThrow('HEALTH_URL');
    delete values.MALWARE_SCAN_URL;
    await expect(service.scannerAvailability()).rejects.toThrow('not configured');
    values.NODE_ENV = 'test';
    await expect(service.scannerAvailability()).resolves.toEqual({
      ok: true, mode: 'development-signature-scan',
    });
  });

  it('requires bucket versioning and proves private read/write/delete readiness', async () => {
    await expect(service.readinessProbe()).resolves.toEqual({
      ok: true, provider: 's3', versionRecovery: true,
    });
    expect(send.mock.calls.map(([command]) => command.constructor.name)).toEqual(
      expect.arrayContaining([
        'GetBucketVersioningCommand', 'PutObjectCommand', 'GetObjectCommand', 'DeleteObjectCommand',
      ]),
    );

    send.mockImplementationOnce(() => Promise.resolve({ Status: 'Suspended' }));
    await expect(service.readinessProbe()).rejects.toThrow('versioning is not enabled');

    values.NODE_ENV = 'test';
    send.mockImplementation((command) => {
      if (command.constructor.name === 'GetBucketVersioningCommand') return Promise.resolve({ Status: 'Suspended' });
      if (command.constructor.name === 'GetObjectCommand') {
        return Promise.resolve({ Body: { transformToByteArray: jest.fn().mockResolvedValue(Buffer.from('wrong')) } });
      }
      return Promise.resolve({});
    });
    await expect(service.readinessProbe()).rejects.toThrow('read-after-write mismatch');
  });

  it('checks S3 object presence and rejects unavailable evidence', async () => {
    current = { id: 'upload-1', storageKey: 'poe/organisation-1/evidence.pdf', status: 'VERIFIED' };
    await expect(service.assertUploadAvailable('upload-1', 'organisation-1')).resolves.toBeUndefined();
    send.mockRejectedValueOnce(new Error('not found'));
    await expect(service.assertUploadAvailable('upload-1', 'organisation-1'))
      .rejects.toThrow('object no longer exists');
    current = null;
    await expect(service.assertUploadAvailable('missing', 'organisation-1'))
      .rejects.toThrow('evidence is unavailable');
  });

  it('recovers an exact retained object version and writes an audit record', async () => {
    current = {
      id: 'upload-1', organisationId: 'organisation-1',
      storageKey: 'poe/organisation-1/evidence.pdf', status: 'VERIFIED',
    };
    await expect(service.recoverObjectVersion(
      'upload-1', 'organisation-1', 'admin-1', 'older',
    )).resolves.toEqual(expect.objectContaining({ recoveredVersionId: 'older' }));
    const copy = send.mock.calls.find(([command]) => command.constructor.name === 'CopyObjectCommand')?.[0];
    expect(copy.input.CopySource).toContain('versionId=older');
    expect(prisma.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ action: 'OBJECT_VERSION_RECOVERED' }),
    }));

    await expect(service.recoverObjectVersion(
      'upload-1', undefined, 'platform-1',
    )).resolves.toEqual(expect.objectContaining({ recoveredVersionId: 'latest' }));
    await expect(service.recoverObjectVersion(
      'upload-1', 'organisation-1', 'admin-1', 'absent',
    )).rejects.toThrow('Object version not found');

    current = null;
    await expect(service.recoverObjectVersion(
      'missing', 'organisation-1', 'admin-1',
    )).rejects.toThrow('Recoverable upload not found');
  });

  it('rejects recovery without object storage and handles signed-download states', async () => {
    for (const key of Object.keys(values)) {
      if (key.startsWith('OBJECT_STORAGE_')) delete values[key];
    }
    await expect(service.recoverObjectVersion('upload-1', 'organisation-1', 'admin-1'))
      .rejects.toThrow('requires S3-compatible storage');

    current = { status: 'REJECTED' };
    await expect(service.getSignedDownloadUrl('key')).rejects.toThrow('not verified');
    current = { status: 'VERIFIED', retentionUntil: new Date(Date.now() - 1000) };
    await expect(service.getSignedDownloadUrl('key')).rejects.toThrow('retention period');
    current = null;
    await expect(service.getSignedDownloadUrl('key')).rejects.toThrow('verification state');
  });

  it('uses private signed URLs and purges all expired S3 objects', async () => {
    current = { status: 'VERIFIED', retentionUntil: new Date(Date.now() + 60_000) };
    await expect(service.getSignedDownloadUrl('poe/organisation-1/evidence.pdf', 30))
      .resolves.toBe('https://signed.example.test/object');
    expect(getSignedUrl).toHaveBeenCalledWith(expect.anything(), expect.anything(), { expiresIn: 30 });

    prisma.uploadRecord.findMany.mockResolvedValueOnce([{
      id: 'expired-1',
      storageKey: 'poe/organisation-1/evidence.pdf',
      quarantineKey: 'quarantine/organisation-1/evidence.pdf',
    }]);
    await expect(service.purgeExpired(5000, 'organisation-1')).resolves.toEqual({
      examined: 1, purged: 1,
    });
    expect(prisma.uploadRecord.update).toHaveBeenCalledWith({
      where: { id: 'expired-1' },
      data: { status: 'PURGED', storageKey: null, quarantineKey: null, failureReason: null },
    });
  });
});
