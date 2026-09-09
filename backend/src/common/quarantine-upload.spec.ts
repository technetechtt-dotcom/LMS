import { access, mkdir, mkdtemp, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import {
  assertAllowedUploadName,
  enforceMultipartRequestSize,
  quarantineUploadOptions,
  type StagedUploadFile,
} from './quarantine-upload';
import { FileStorageService } from './file-storage.service';

describe('quarantine multipart security', () => {
  let root: string;
  let current: Record<string, unknown> | null;
  let service: FileStorageService;
  let uploadRecord: {
    create: jest.Mock;
    update: jest.Mock;
    findUnique: jest.Mock;
    findFirst: jest.Mock;
  };

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'skillforge-quarantine-'));
    await mkdir(join(root, 'quarantine', 'incoming'), { recursive: true });
    current = null;
    uploadRecord = {
      create: jest.fn().mockImplementation(({ data }) => {
        current = { id: 'upload-staged', ...data };
        return current;
      }),
      update: jest.fn().mockImplementation(({ data }) => {
        current = { ...current, ...data };
        return current;
      }),
      findUnique: jest.fn().mockImplementation(() => current),
      findFirst: jest.fn().mockImplementation(() => current),
    };
    const values: Record<string, string> = {
      NODE_ENV: 'test',
      UPLOAD_DIR: root,
      UPLOAD_MAX_MB: '1',
      UPLOAD_RETENTION_DAYS: '30',
      FILE_SIGNING_SECRET: 'unit-test-file-signing-secret-32-characters',
    };
    service = new FileStorageService(
      { get: jest.fn((key: string) => values[key]) } as never,
      { uploadRecord } as never,
    );
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  const staged = async (
    name: string,
    bytes: Buffer,
    mime = 'application/pdf',
  ): Promise<StagedUploadFile> => {
    const path = join(root, 'quarantine', 'incoming', `part-${Date.now()}-${Math.random()}`);
    await writeFile(path, bytes);
    return {
      path,
      originalname: name,
      mimetype: mime,
      size: bytes.length,
    } as StagedUploadFile;
  };

  const officeArchive = (names: string[]) => {
    const localHeader = Buffer.alloc(4);
    localHeader.writeUInt32LE(0x04034b50, 0);
    const entries = names.map((name) => {
      const encoded = Buffer.from(name, 'utf8');
      const entry = Buffer.alloc(46 + encoded.length);
      entry.writeUInt32LE(0x02014b50, 0);
      entry.writeUInt16LE(encoded.length, 28);
      encoded.copy(entry, 46);
      return entry;
    });
    const directory = Buffer.concat(entries);
    const eocd = Buffer.alloc(22);
    eocd.writeUInt32LE(0x06054b50, 0);
    eocd.writeUInt16LE(entries.length, 8);
    eocd.writeUInt16LE(entries.length, 10);
    eocd.writeUInt32LE(directory.length, 12);
    eocd.writeUInt32LE(localHeader.length, 16);
    return Buffer.concat([localHeader, directory, eocd]);
  };

  it('caps file, field, part, header and name sizes at the parser', () => {
    const options = quarantineUploadOptions({ maxMb: 2, maxFiles: 2, maxFields: 3 });
    expect(options.limits).toEqual(expect.objectContaining({
      fileSize: 2 * 1024 * 1024,
      files: 2,
      fields: 3,
      fieldNameSize: 64,
      parts: 5,
      headerPairs: 64,
    }));
  });

  it('rejects oversized multipart bodies before parsing', () => {
    const previous = process.env.UPLOAD_TOTAL_MAX_MB;
    process.env.UPLOAD_TOTAL_MAX_MB = '1';
    try {
      expect(() => enforceMultipartRequestSize(
        'multipart/form-data; boundary=test',
        String(1024 * 1024 + 1),
      )).toThrow('Multipart request exceeds 1MB');
    } finally {
      if (previous === undefined) delete process.env.UPLOAD_TOTAL_MAX_MB;
      else process.env.UPLOAD_TOTAL_MAX_MB = previous;
    }
  });

  it.each(['payload.exe', 'macro.docm', 'script.ps1', 'archive.zip'])(
    'rejects malicious or unsupported multipart filename %s',
    (name) => expect(() => assertAllowedUploadName(name)).toThrow(),
  );

  it('rejects malformed signature/MIME combinations and removes the part', async () => {
    const file = await staged('disguised.pdf', Buffer.from('MZ executable body'));
    await expect(service.uploadStaged(file)).rejects.toThrow('signature');
    await expect(access(file.path)).rejects.toThrow();
    expect(uploadRecord.create).not.toHaveBeenCalled();
  });

  it.each([
    ['evidence.pdf', Buffer.from('%PDF-1.7\nclean'), 'application/pdf'],
    ['photo.png', Buffer.concat([Buffer.from('89504e470d0a1a0a', 'hex'), Buffer.from('clean')]), 'image/png'],
    ['photo.jpg', Buffer.concat([Buffer.from('ffd8ff', 'hex'), Buffer.from('clean')]), 'image/jpeg'],
    ['image.gif', Buffer.from('GIF89aclean'), 'image/gif'],
    ['image.webp', Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WEBPclean')]), 'image/webp'],
    ['video.mp4', Buffer.concat([Buffer.alloc(4), Buffer.from('ftyp'), Buffer.from('clean')]), 'video/mp4'],
    ['audio.mp3', Buffer.from('ID3clean'), 'audio/mpeg'],
    ['audio.wav', Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WAVEclean')]), 'audio/wav'],
    ['notes.txt', Buffer.from('plain evidence'), 'text/plain'],
    ['rows.csv', Buffer.from('name,value\nAda,1'), 'text/csv'],
    ['data.json', Buffer.from('{"verified":true}'), 'application/json'],
    ['data.xml', Buffer.from('<?xml version="1.0"?><evidence/>'), 'text/xml'],
  ])('accepts a valid %s signature and records verified provenance', async (name, bytes, mime) => {
    const file = await staged(name, bytes, mime);
    const stored = await service.uploadStaged(file, {
      prefix: 'poe', organisationId: 'organisation-1', uploadedById: 'learner-1',
    });
    expect(stored).toEqual(expect.objectContaining({
      status: 'VERIFIED', sha256: expect.stringMatching(/^[a-f0-9]{64}$/),
    }));
    expect(current).toEqual(expect.objectContaining({
      status: 'VERIFIED', scanResult: 'local-signature-scan',
      scannedAt: expect.any(Date), verifiedAt: expect.any(Date),
    }));
  });

  it('accepts macro-free Office documents and rejects embedded active content', async () => {
    const clean = await staged(
      'workbook.docx',
      officeArchive(['[Content_Types].xml', 'word/document.xml']),
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    );
    await expect(service.uploadStaged(clean)).resolves.toEqual(
      expect.objectContaining({ mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }),
    );

    const macro = await staged(
      'workbook.docx',
      officeArchive(['[Content_Types].xml', 'word/document.xml', 'word/vbaProject.bin']),
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    );
    await expect(service.uploadStaged(macro)).rejects.toThrow('macros or embedded executables');
  });

  it.each([
    ['wrong-mime.png', Buffer.concat([Buffer.from('89504e470d0a1a0a', 'hex'), Buffer.from('clean')]), 'application/pdf', 'Browser MIME'],
    ['script.txt', Buffer.from('#!/bin/sh\necho unsafe'), 'text/plain', 'Script content'],
    ['bad.json', Buffer.from('not-json'), 'application/json', 'Malformed JSON'],
    ['binary.csv', Buffer.from([0, 1, 2]), 'text/csv', 'signature'],
    ['broken.docx', Buffer.from('PK\u0003\u0004not-a-directory'), 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'Malformed Office'],
  ])('rejects malformed content in %s', async (name, bytes, mime, message) => {
    const file = await staged(name, bytes, mime);
    await expect(service.uploadStaged(file)).rejects.toThrow(message);
    await expect(access(file.path)).rejects.toThrow();
  });

  it('rejects oversized staged parts and removes them', async () => {
    const file = await staged('large.pdf', Buffer.alloc(1024 * 1024 + 1));
    await expect(service.uploadStaged(file)).rejects.toThrow('exceeds 1MB');
    await expect(access(file.path)).rejects.toThrow();
  });

  it('rejects malicious content after quarantine and never promotes it', async () => {
    const file = await staged(
      'evidence.txt',
      Buffer.from('EICAR-STANDARD-ANTIVIRUS-TEST-FILE'),
      'text/plain',
    );
    await expect(service.uploadStaged(file, {
      prefix: 'poe',
      organisationId: 'organisation-1',
      uploadedById: 'learner-1',
    })).rejects.toThrow('rejected by malware scanning');
    expect(current).toEqual(expect.objectContaining({ status: 'REJECTED' }));
    expect((current as { storageKey?: string })?.storageKey).toBeUndefined();
  });

  it('cleans up an aborted partial multipart file without retaining a handle', async () => {
    const file = await staged('partial.pdf', Buffer.from('%PDF-partial'));
    await service.discardStaged(file);
    await expect(access(file.path)).rejects.toThrow();
    await expect(writeFile(file.path, Buffer.from('reusable'))).resolves.toBeUndefined();
  });
});
