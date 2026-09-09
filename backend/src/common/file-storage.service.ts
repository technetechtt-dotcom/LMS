import { createHash, createHmac, randomUUID, timingSafeEqual } from 'crypto';
import { createReadStream } from 'fs';
import { access, mkdir, open, readFile, rename, stat, unlink, writeFile } from 'fs/promises';
import { dirname, resolve, sep } from 'path';
import type { Readable } from 'stream';
import {
  CopyObjectCommand,
  DeleteObjectCommand,
  GetBucketVersioningCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectVersionsCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  PayloadTooLargeException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import {
  assertAllowedUploadName,
  originalExtension,
  type StagedUploadFile,
} from './quarantine-upload';

export type StoredFile = {
  key: string;
  bucket: string;
  mimeType: string;
  size: number;
  sha256: string;
  uploadId: string;
  status: 'VERIFIED';
  url: string;
  provider: 'local' | 's3';
};

type FileMeta = {
  mimeType: string;
  fileName: string;
  size: number;
  sha256?: string;
};

type UploadOptions = {
  prefix?: string;
  organisationId?: string;
  uploadedById?: string;
};

const MIME_BY_EXTENSION: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.mp4': 'video/mp4',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.txt': 'text/plain',
  '.csv': 'text/csv',
  '.json': 'application/json',
  '.xml': 'application/xml',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
};

@Injectable()
export class FileStorageService {
  private readonly logger = new Logger(FileStorageService.name);
  private s3Client?: S3Client;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  private uploadRoot(): string {
    const configured = this.config.get<string>('UPLOAD_DIR')?.trim();
    return resolve(configured && configured.length ? configured : 'uploads');
  }

  private publicApiBase(): string {
    const configured =
      this.config.get<string>('API_PUBLIC_URL')?.trim() ||
      this.config.get<string>('RENDER_EXTERNAL_URL')?.trim();
    return (configured || 'http://localhost:8787').replace(/\/$/, '');
  }

  private signingSecret(): string {
    return this.config.get<string>('FILE_SIGNING_SECRET')?.trim()
      || this.config.get<string>('JWT_SECRET')?.trim()
      || 'local-file-secret';
  }

  private objectConfig() {
    const endpoint = this.config.get<string>('OBJECT_STORAGE_ENDPOINT')?.trim();
    const bucket = this.config.get<string>('OBJECT_STORAGE_BUCKET')?.trim();
    const region = this.config.get<string>('OBJECT_STORAGE_REGION')?.trim();
    const accessKeyId = this.config.get<string>('OBJECT_STORAGE_ACCESS_KEY_ID')?.trim();
    const secretAccessKey = this.config
      .get<string>('OBJECT_STORAGE_SECRET_ACCESS_KEY')
      ?.trim();
    if (!endpoint || !bucket || !region || !accessKeyId || !secretAccessKey) {
      return null;
    }
    return { endpoint, bucket, region, accessKeyId, secretAccessKey };
  }

  private s3() {
    const object = this.objectConfig();
    if (!object) throw new BadRequestException('Object storage is not configured');
    if (!this.s3Client) {
      this.s3Client = new S3Client({
        endpoint: object.endpoint,
        region: object.region,
        forcePathStyle:
          (this.config.get<string>('OBJECT_STORAGE_FORCE_PATH_STYLE') ?? 'true')
            .toLowerCase() === 'true',
        credentials: {
          accessKeyId: object.accessKeyId,
          secretAccessKey: object.secretAccessKey,
        },
      });
    }
    return { client: this.s3Client, bucket: object.bucket };
  }

  private absolutePath(key: string): string {
    const root = this.uploadRoot();
    const full = resolve(root, key);
    const prefix = root.endsWith(sep) ? root : `${root}${sep}`;
    if (full !== root && !full.startsWith(prefix)) {
      throw new BadRequestException('Invalid storage key');
    }
    return full;
  }

  private stagedPath(path: string): string {
    const incomingRoot = resolve(this.uploadRoot(), 'quarantine', 'incoming');
    const full = resolve(path);
    const prefix = incomingRoot.endsWith(sep) ? incomingRoot : `${incomingRoot}${sep}`;
    if (!full.startsWith(prefix)) {
      throw new BadRequestException('Upload was not staged in quarantine storage');
    }
    return full;
  }

  private async hashFile(path: string): Promise<string> {
    const hash = createHash('sha256');
    for await (const chunk of createReadStream(path)) {
      hash.update(chunk as Buffer);
    }
    return hash.digest('hex');
  }

  private async readPrefix(path: string, length = 8192): Promise<Buffer> {
    const handle = await open(path, 'r');
    try {
      const buffer = Buffer.alloc(length);
      const { bytesRead } = await handle.read(buffer, 0, length, 0);
      return buffer.subarray(0, bytesRead);
    } finally {
      await handle.close();
    }
  }

  private async zipEntryNames(path: string, size: number): Promise<string[]> {
    const tailSize = Math.min(size, 65_557);
    const handle = await open(path, 'r');
    try {
      const tail = Buffer.alloc(tailSize);
      await handle.read(tail, 0, tailSize, size - tailSize);
      let eocd = -1;
      for (let i = tail.length - 22; i >= 0; i -= 1) {
        if (tail.readUInt32LE(i) === 0x06054b50) {
          eocd = i;
          break;
        }
      }
      if (eocd < 0) throw new BadRequestException('Malformed Office document archive');
      const directorySize = tail.readUInt32LE(eocd + 12);
      const directoryOffset = tail.readUInt32LE(eocd + 16);
      if (directorySize <= 0 || directorySize > 4 * 1024 * 1024) {
        throw new BadRequestException('Unsupported Office document archive');
      }
      const directory = Buffer.alloc(directorySize);
      const result = await handle.read(directory, 0, directorySize, directoryOffset);
      if (result.bytesRead !== directorySize) {
        throw new BadRequestException('Malformed Office document archive');
      }
      const names: string[] = [];
      let offset = 0;
      while (offset + 46 <= directory.length) {
        if (directory.readUInt32LE(offset) !== 0x02014b50) {
          throw new BadRequestException('Malformed Office document archive');
        }
        const nameLength = directory.readUInt16LE(offset + 28);
        const extraLength = directory.readUInt16LE(offset + 30);
        const commentLength = directory.readUInt16LE(offset + 32);
        const end = offset + 46 + nameLength + extraLength + commentLength;
        if (end > directory.length) {
          throw new BadRequestException('Malformed Office document archive');
        }
        names.push(directory.subarray(offset + 46, offset + 46 + nameLength).toString('utf8'));
        if (names.length > 10_000) {
          throw new BadRequestException('Office document contains too many entries');
        }
        offset = end;
      }
      return names;
    } finally {
      await handle.close();
    }
  }

  private async validateSignature(
    path: string,
    size: number,
    originalName: string,
    suppliedMime: string,
  ): Promise<{ mimeType: string; extension: string }> {
    assertAllowedUploadName(originalName);
    const extension = originalExtension(originalName);
    const expected = MIME_BY_EXTENSION[extension];
    if (!expected) throw new BadRequestException('Unsupported file type');
    const prefix = await this.readPrefix(path);
    const ascii = prefix.toString('utf8').toLowerCase();
    const hex = prefix.subarray(0, 16).toString('hex');
    const isZip = hex.startsWith('504b0304');
    let signatureOk = false;

    if (extension === '.pdf') signatureOk = prefix.subarray(0, 5).toString() === '%PDF-';
    else if (extension === '.png') signatureOk = hex.startsWith('89504e470d0a1a0a');
    else if (extension === '.jpg' || extension === '.jpeg') signatureOk = hex.startsWith('ffd8ff');
    else if (extension === '.gif') signatureOk = /^(GIF87a|GIF89a)/.test(prefix.subarray(0, 6).toString());
    else if (extension === '.webp') {
      signatureOk = prefix.subarray(0, 4).toString() === 'RIFF' && prefix.subarray(8, 12).toString() === 'WEBP';
    } else if (extension === '.mp4') signatureOk = prefix.subarray(4, 8).toString() === 'ftyp';
    else if (extension === '.mp3') signatureOk = prefix.subarray(0, 3).toString() === 'ID3' || (prefix[0] === 0xff && (prefix[1] & 0xe0) === 0xe0);
    else if (extension === '.wav') {
      signatureOk = prefix.subarray(0, 4).toString() === 'RIFF' && prefix.subarray(8, 12).toString() === 'WAVE';
    } else if (['.docx', '.xlsx', '.pptx'].includes(extension)) {
      if (!isZip) throw new BadRequestException('File signature does not match its Office format');
      const names = await this.zipEntryNames(path, size);
      const lower = names.map((name) => name.toLowerCase());
      const expectedRoot = extension === '.docx' ? 'word/' : extension === '.xlsx' ? 'xl/' : 'ppt/';
      signatureOk = lower.includes('[content_types].xml') && lower.some((name) => name.startsWith(expectedRoot));
      const dangerous = lower.some((name) =>
        name.includes('vbaproject.bin') ||
        name.includes('/embeddings/') ||
        name.includes('/activex/') ||
        name.includes('oleobject') ||
        /\.(exe|dll|js|vbs|ps1|bat|cmd|com|scr)$/.test(name),
      );
      if (dangerous) throw new BadRequestException('Office macros or embedded executables are not supported');
    } else {
      signatureOk = prefix.length > 0 && !prefix.includes(0);
      if (/^\s*(#!|<script|<\?php|powershell\b|@echo\s+off\b)/i.test(ascii)) {
        throw new BadRequestException('Script content is not supported');
      }
      if (extension === '.json' && !/^\s*[\[{]/.test(ascii)) {
        throw new BadRequestException('Malformed JSON upload');
      }
    }
    if (!signatureOk || hex.startsWith('4d5a')) {
      throw new BadRequestException('File signature does not match an allowed format');
    }
    const normalizedSupplied = suppliedMime.split(';')[0].trim().toLowerCase();
    const compatible = !normalizedSupplied ||
      normalizedSupplied === 'application/octet-stream' ||
      normalizedSupplied === expected ||
      (expected === 'application/xml' && ['text/xml', 'application/xml'].includes(normalizedSupplied));
    if (!compatible) throw new BadRequestException('Browser MIME type does not match the file signature');
    return { mimeType: expected, extension };
  }

  private metaPath(filePath: string): string {
    return `${filePath}.meta.json`;
  }

  storageLocator(key: string, bucket?: string) {
    const providerBucket = bucket || this.objectConfig()?.bucket || 'local';
    return `storage://${providerBucket}/${key}`;
  }

  async assertValidStorageKey(
    storageKey: string,
    organisationId: string,
    allowedPrefixes = [
      'uploads',
      'poe',
      'certificates',
      'compliance',
      'materials',
      'assessment-answers',
      'messages',
      'signatures',
      'exports',
    ],
  ): Promise<string> {
    let key = storageKey.trim();
    if (key.startsWith('storage://')) {
      const without = key.slice('storage://'.length);
      const slash = without.indexOf('/');
      key = slash >= 0 ? without.slice(slash + 1) : without;
    }
    if (!key || key.includes('..') || key.startsWith('/')) {
      throw new BadRequestException('Invalid storageKey');
    }
    if (!allowedPrefixes.some((prefix) => key.startsWith(`${prefix}/`))) {
      throw new BadRequestException('storageKey must be a server-issued upload key');
    }
    if (!key.includes(`/${organisationId}/`) && !key.startsWith('exports/')) {
      if (this.config.get<string>('NODE_ENV') === 'production') {
        throw new BadRequestException('storageKey must belong to the active organisation');
      }
    }
    const verified = await this.prisma.uploadRecord.findFirst({
      where: {
        storageKey: key,
        status: 'VERIFIED',
        organisationId,
        OR: [
          { retentionUntil: null },
          { retentionUntil: { gt: new Date() } },
        ],
      },
      select: { id: true },
    });
    if (!verified) {
      throw new BadRequestException(
        'storageKey is not a verified upload for the active organisation',
      );
    }
    return key;
  }

  private async scan(
    quarantineKey: string,
    metadata: { mimeType: string; sha256: string; size: number },
    localPath?: string,
  ) {
    const endpoint = this.config.get<string>('MALWARE_SCAN_URL')?.trim();
    if (!endpoint) {
      if (this.config.get<string>('NODE_ENV') === 'production') {
        throw new BadRequestException('Malware scanning is not configured');
      }
      if (!localPath) {
        return { clean: true, details: 'trusted-server-generated-file' };
      }
      const marker = 'EICAR-STANDARD-ANTIVIRUS-TEST-FILE';
      let carry = '';
      for await (const chunk of createReadStream(localPath)) {
        const text = carry + (chunk as Buffer).toString('latin1');
        if (text.includes(marker)) {
          return { clean: false, details: 'local-eicar-signature-detected' };
        }
        carry = text.slice(-marker.length);
      }
      return { clean: true, details: 'local-signature-scan' };
    }
    const token = this.config.get<string>('MALWARE_SCAN_TOKEN')?.trim();
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        bucket: this.objectConfig()?.bucket ?? 'local',
        quarantineKey,
        ...metadata,
      }),
    });
    if (!response.ok) throw new BadRequestException('Malware scanner failed');
    const result = (await response.json()) as { clean?: boolean; details?: string };
    return { clean: result.clean === true, details: result.details ?? 'scanner-response' };
  }

  async upload(
    fileName: string,
    bytes: Buffer,
    mimeType: string,
    opts?: UploadOptions,
  ): Promise<StoredFile> {
    const maxMb = Number(this.config.get<string>('UPLOAD_MAX_MB') ?? '25');
    if (!bytes.length) throw new BadRequestException('Empty files are not accepted');
    if (bytes.length > maxMb * 1024 * 1024) {
      throw new PayloadTooLargeException(`File exceeds ${maxMb}MB`);
    }

    const provider = this.objectConfig() ? 's3' : 'local';
    if (provider === 'local' && this.config.get<string>('NODE_ENV') === 'production') {
      throw new BadRequestException('Durable object storage is required in production');
    }
    const prefix = (opts?.prefix ?? 'uploads').replace(/^\/+|\/+$/g, '');
    const orgPart = opts?.organisationId ? `${opts.organisationId}/` : '';
    const extension = originalExtension(fileName) || '.bin';
    const unique = randomUUID();
    const finalKey = `${prefix}/${orgPart}${unique}${extension}`;
    const quarantineKey = `quarantine/${orgPart}${unique}${extension}`;
    const sha256 = createHash('sha256').update(bytes).digest('hex');
    const retentionDays = Math.max(
      1,
      Number(this.config.get<string>('UPLOAD_RETENTION_DAYS') ?? '2555') || 2555,
    );
    const record = await this.prisma.uploadRecord.create({
      data: {
        organisationId: opts?.organisationId,
        uploadedById: opts?.uploadedById,
        originalName: fileName,
        mimeType: mimeType || 'application/octet-stream',
        size: bytes.length,
        sha256,
        provider,
        quarantineKey,
        status: 'QUARANTINED',
        retentionUntil: new Date(Date.now() + retentionDays * 86400000),
      },
    });

    try {
      if (provider === 's3') {
        const { client, bucket } = this.s3();
        await client.send(
          new PutObjectCommand({
            Bucket: bucket,
            Key: quarantineKey,
            Body: bytes,
            ContentType: mimeType || 'application/octet-stream',
            Metadata: { uploadId: record.id, sha256, state: 'quarantined' },
          }),
        );
      } else {
        const path = this.absolutePath(quarantineKey);
        await mkdir(dirname(path), { recursive: true });
        await writeFile(path, bytes);
      }

      await this.prisma.uploadRecord.update({
        where: { id: record.id },
        data: { status: 'SCANNING' },
      });
      const scanned = await this.scan(quarantineKey, {
        mimeType: mimeType || 'application/octet-stream',
        sha256,
        size: bytes.length,
      }, provider === 'local' ? this.absolutePath(quarantineKey) : undefined);
      if (!scanned.clean) {
        await this.prisma.uploadRecord.update({
          where: { id: record.id },
          data: { status: 'REJECTED', failureReason: scanned.details.slice(0, 500) },
        });
        throw new BadRequestException('Upload rejected by malware scanning');
      }

      if (provider === 's3') {
        const { client, bucket } = this.s3();
        await client.send(
          new CopyObjectCommand({
            Bucket: bucket,
            Key: finalKey,
            CopySource: `${bucket}/${quarantineKey}`,
            MetadataDirective: 'REPLACE',
            ContentType: mimeType || 'application/octet-stream',
            Metadata: { uploadId: record.id, sha256, state: 'verified' },
          }),
        );
        await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: quarantineKey }));
      } else {
        const source = this.absolutePath(quarantineKey);
        const target = this.absolutePath(finalKey);
        await mkdir(dirname(target), { recursive: true });
        await rename(source, target);
        const meta: FileMeta = {
          mimeType: mimeType || 'application/octet-stream',
          fileName,
          size: bytes.length,
          sha256,
        };
        await writeFile(this.metaPath(target), JSON.stringify(meta), 'utf8');
      }

      await this.prisma.uploadRecord.update({
        where: { id: record.id },
        data: {
          storageKey: finalKey,
          quarantineKey: null,
          status: 'VERIFIED',
          scanResult: scanned.details.slice(0, 500),
          scannedAt: new Date(),
          verifiedAt: new Date(),
          failureReason: null,
        },
      });
      this.logger.log(`Upload ${record.id} verified (${provider})`);
      const bucket = this.objectConfig()?.bucket ?? 'local';
      return {
        key: finalKey,
        bucket,
        mimeType: mimeType || 'application/octet-stream',
        size: bytes.length,
        sha256,
        uploadId: record.id,
        status: 'VERIFIED',
        url: this.storageLocator(finalKey, bucket),
        provider,
      };
    } catch (error) {
      const current = await this.prisma.uploadRecord.findUnique({ where: { id: record.id } });
      if (current?.status !== 'REJECTED') {
        await this.prisma.uploadRecord.update({
          where: { id: record.id },
          data: {
            status: 'FAILED',
            failureReason: (error instanceof Error ? error.message : String(error)).slice(0, 500),
          },
        });
      }
      throw error;
    }
  }

  /**
   * Promotes a Multer disk-staged file without ever materialising the complete
   * body in application memory. The incoming path is itself inside quarantine.
   */
  async uploadStaged(
    file: StagedUploadFile | undefined,
    opts?: UploadOptions,
  ): Promise<StoredFile> {
    if (!file?.path) throw new BadRequestException('A file is required');
    const staged = this.stagedPath(file.path);
    const maxMb = Number(this.config.get<string>('UPLOAD_MAX_MB') ?? '25');
    const details = await stat(staged).catch(() => null);
    if (!details?.isFile() || details.size <= 0) {
      await unlink(staged).catch(() => undefined);
      throw new BadRequestException('Empty files are not accepted');
    }
    if (details.size > maxMb * 1024 * 1024) {
      await unlink(staged).catch(() => undefined);
      throw new PayloadTooLargeException(`File exceeds ${maxMb}MB`);
    }

    const provider = this.objectConfig() ? 's3' : 'local';
    if (provider === 'local' && this.config.get<string>('NODE_ENV') === 'production') {
      await unlink(staged).catch(() => undefined);
      throw new BadRequestException('Durable object storage is required in production');
    }

    let recordId: string | undefined;
    let quarantineKey: string | undefined;
    let quarantineLocalPath: string | undefined;
    try {
      const signature = await this.validateSignature(
        staged,
        details.size,
        file.originalname,
        file.mimetype || 'application/octet-stream',
      );
      const sha256 = await this.hashFile(staged);
      const prefix = (opts?.prefix ?? 'uploads').replace(/^\/+|\/+$/g, '');
      const orgPart = opts?.organisationId ? `${opts.organisationId}/` : '';
      const objectId = randomUUID();
      const finalKey = `${prefix}/${orgPart}${objectId}${signature.extension}`;
      quarantineKey = `quarantine/${orgPart}${objectId}${signature.extension}`;
      const retentionDays = Math.max(
        1,
        Number(this.config.get<string>('UPLOAD_RETENTION_DAYS') ?? '2555') || 2555,
      );
      const record = await this.prisma.uploadRecord.create({
        data: {
          organisationId: opts?.organisationId,
          uploadedById: opts?.uploadedById,
          originalName: file.originalname,
          mimeType: signature.mimeType,
          size: details.size,
          sha256,
          provider,
          quarantineKey,
          status: 'QUARANTINED',
          retentionUntil: new Date(Date.now() + retentionDays * 86400000),
        },
      });
      recordId = record.id;

      if (provider === 's3') {
        const { client, bucket } = this.s3();
        await client.send(new PutObjectCommand({
          Bucket: bucket,
          Key: quarantineKey,
          Body: createReadStream(staged),
          ContentLength: details.size,
          ContentType: signature.mimeType,
          Metadata: { uploadId: record.id, sha256, state: 'quarantined' },
        }));
        await unlink(staged).catch(() => undefined);
      } else {
        quarantineLocalPath = this.absolutePath(quarantineKey);
        await mkdir(dirname(quarantineLocalPath), { recursive: true });
        await rename(staged, quarantineLocalPath);
      }

      await this.prisma.uploadRecord.update({
        where: { id: record.id },
        data: { status: 'SCANNING' },
      });
      const scanned = await this.scan(
        quarantineKey,
        { mimeType: signature.mimeType, sha256, size: details.size },
        quarantineLocalPath,
      );
      if (!scanned.clean) {
        await this.prisma.uploadRecord.update({
          where: { id: record.id },
          data: {
            status: 'REJECTED',
            scanResult: scanned.details.slice(0, 500),
            scannedAt: new Date(),
            failureReason: scanned.details.slice(0, 500),
          },
        });
        if (provider === 's3') {
          const { client, bucket } = this.s3();
          await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: quarantineKey }));
        } else if (quarantineLocalPath) {
          await unlink(quarantineLocalPath).catch(() => undefined);
        }
        throw new BadRequestException('Upload rejected by malware scanning');
      }

      if (provider === 's3') {
        const { client, bucket } = this.s3();
        await client.send(new CopyObjectCommand({
          Bucket: bucket,
          Key: finalKey,
          CopySource: `${bucket}/${quarantineKey}`,
          MetadataDirective: 'REPLACE',
          ContentType: signature.mimeType,
          Metadata: { uploadId: record.id, sha256, state: 'verified' },
        }));
        await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: quarantineKey }));
      } else {
        const target = this.absolutePath(finalKey);
        await mkdir(dirname(target), { recursive: true });
        await rename(quarantineLocalPath!, target);
        await writeFile(this.metaPath(target), JSON.stringify({
          mimeType: signature.mimeType,
          fileName: file.originalname,
          size: details.size,
          sha256,
        } satisfies FileMeta), 'utf8');
      }

      await this.prisma.uploadRecord.update({
        where: { id: record.id },
        data: {
          storageKey: finalKey,
          quarantineKey: null,
          status: 'VERIFIED',
          scanResult: scanned.details.slice(0, 500),
          scannedAt: new Date(),
          verifiedAt: new Date(),
          failureReason: null,
        },
      });
      const bucket = this.objectConfig()?.bucket ?? 'local';
      return {
        key: finalKey,
        bucket,
        mimeType: signature.mimeType,
        size: details.size,
        sha256,
        uploadId: record.id,
        status: 'VERIFIED',
        url: this.storageLocator(finalKey, bucket),
        provider,
      };
    } catch (error) {
      await unlink(staged).catch(() => undefined);
      if (quarantineLocalPath) {
        await unlink(quarantineLocalPath).catch(() => undefined);
      }
      if (provider === 's3' && quarantineKey) {
        const { client, bucket } = this.s3();
        await client.send(
          new DeleteObjectCommand({ Bucket: bucket, Key: quarantineKey }),
        ).catch(() => undefined);
      }
      if (recordId) {
        const current = await this.prisma.uploadRecord.findUnique({ where: { id: recordId } });
        if (current && current.status !== 'REJECTED') {
          await this.prisma.uploadRecord.update({
            where: { id: recordId },
            data: {
              status: 'FAILED',
              failureReason: (error instanceof Error ? error.message : String(error)).slice(0, 500),
            },
          });
        }
      }
      throw error;
    }
  }

  async discardStaged(file: StagedUploadFile | undefined): Promise<void> {
    if (!file?.path) return;
    try {
      await unlink(this.stagedPath(file.path));
    } catch {
      // Already promoted or Multer cleaned it after an aborted request.
    }
  }

  async getUploadState(id: string, organisationId?: string) {
    const row = await this.prisma.uploadRecord.findFirst({
      where: {
        id,
        ...(organisationId ? { organisationId } : {}),
      },
      select: {
        id: true,
        originalName: true,
        size: true,
        sha256: true,
        status: true,
        failureReason: true,
        verifiedAt: true,
        retentionUntil: true,
      },
    });
    if (!row) throw new NotFoundException('Upload not found');
    return row;
  }

  async assertUploadAvailable(uploadId: string, organisationId: string): Promise<void> {
    const record = await this.prisma.uploadRecord.findFirst({
      where: {
        id: uploadId,
        organisationId,
        status: 'VERIFIED',
        storageKey: { not: null },
        OR: [{ retentionUntil: null }, { retentionUntil: { gt: new Date() } }],
      },
      select: { storageKey: true },
    });
    if (!record?.storageKey) {
      throw new BadRequestException('Verified upload evidence is unavailable');
    }
    try {
      if (this.objectConfig()) {
        const { client, bucket } = this.s3();
        await client.send(new HeadObjectCommand({ Bucket: bucket, Key: record.storageKey }));
      } else {
        await access(this.absolutePath(record.storageKey));
      }
    } catch {
      throw new BadRequestException('Verified upload object no longer exists');
    }
  }

  async readinessProbe(): Promise<{
    ok: boolean;
    provider: 'local' | 's3';
    versionRecovery: boolean;
  }> {
    const provider = this.objectConfig() ? 's3' : 'local';
    if (provider === 'local' && this.config.get<string>('NODE_ENV') === 'production') {
      throw new Error('Private object storage is not configured');
    }
    const key = `quarantine/readiness/${randomUUID()}.txt`;
    const probe = Buffer.from('readiness');
    if (provider === 's3') {
      const { client, bucket } = this.s3();
      const versioning = await client.send(
        new GetBucketVersioningCommand({ Bucket: bucket }),
      );
      if (this.config.get<string>('NODE_ENV') === 'production'
        && versioning.Status !== 'Enabled') {
        throw new Error('Object storage versioning is not enabled');
      }
      try {
        await client.send(new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: probe,
          ContentType: 'text/plain',
          Metadata: { purpose: 'readiness-probe' },
        }));
        const read = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
        const bytes = read.Body ? Buffer.from(await read.Body.transformToByteArray()) : Buffer.alloc(0);
        if (!bytes.equals(probe)) throw new Error('Object storage read-after-write mismatch');
      } finally {
        await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key })).catch(() => undefined);
      }
    } else {
      const path = this.absolutePath(key);
      await mkdir(dirname(path), { recursive: true });
      try {
        await writeFile(path, probe);
        const bytes = await readFile(path);
        if (!bytes.equals(probe)) throw new Error('Local storage read-after-write mismatch');
      } finally {
        await unlink(path).catch(() => undefined);
      }
    }
    return { ok: true, provider, versionRecovery: provider === 's3' };
  }

  async recoverObjectVersion(
    uploadId: string,
    organisationId: string | undefined,
    actorId: string,
    requestedVersionId?: string,
  ) {
    if (!this.objectConfig()) {
      throw new BadRequestException('Object version recovery requires S3-compatible storage');
    }
    const record = await this.prisma.uploadRecord.findFirst({
      where: {
        id: uploadId,
        ...(organisationId ? { organisationId } : {}),
        storageKey: { not: null },
      },
    });
    if (!record?.storageKey) throw new NotFoundException('Recoverable upload not found');

    const { client, bucket } = this.s3();
    const listed = await client.send(new ListObjectVersionsCommand({
      Bucket: bucket,
      Prefix: record.storageKey,
      MaxKeys: 100,
    }));
    const versions = (listed.Versions ?? [])
      .filter((item) => item.Key === record.storageKey && item.VersionId)
      .sort((a, b) => (b.LastModified?.getTime() ?? 0) - (a.LastModified?.getTime() ?? 0));
    const version = requestedVersionId
      ? versions.find((item) => item.VersionId === requestedVersionId)
      : versions[0];
    if (!version?.VersionId) throw new NotFoundException('Object version not found');

    await client.send(new CopyObjectCommand({
      Bucket: bucket,
      Key: record.storageKey,
      CopySource: `${bucket}/${record.storageKey}?versionId=${encodeURIComponent(version.VersionId)}`,
      MetadataDirective: 'COPY',
    }));
    await client.send(new HeadObjectCommand({ Bucket: bucket, Key: record.storageKey }));
    await this.prisma.$transaction([
      this.prisma.uploadRecord.update({
        where: { id: record.id },
        data: {
          status: 'VERIFIED',
          failureReason: null,
          verifiedAt: new Date(),
        },
      }),
      this.prisma.auditLog.create({
        data: {
          actorId,
          entityType: 'UploadRecord',
          entityId: record.id,
          action: 'OBJECT_VERSION_RECOVERED',
          afterValue: {
            storageKey: record.storageKey,
            sourceVersionId: version.VersionId,
          },
        },
      }),
    ]);
    return {
      uploadId: record.id,
      storageKey: record.storageKey,
      recoveredVersionId: version.VersionId,
      recoveredAt: new Date().toISOString(),
    };
  }

  async scannerAvailability(): Promise<{ ok: boolean; mode: string }> {
    const endpoint = this.config.get<string>('MALWARE_SCAN_HEALTH_URL')?.trim();
    const scanner = this.config.get<string>('MALWARE_SCAN_URL')?.trim();
    if (!scanner) {
      if (this.config.get<string>('NODE_ENV') === 'production') {
        throw new Error('Malware scanner is not configured');
      }
      return { ok: true, mode: 'development-signature-scan' };
    }
    if (!endpoint) throw new Error('MALWARE_SCAN_HEALTH_URL is not configured');
    const token = this.config.get<string>('MALWARE_SCAN_TOKEN')?.trim();
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      signal: AbortSignal.timeout(5_000),
    });
    if (!response.ok) throw new Error(`Malware scanner health returned ${response.status}`);
    return { ok: true, mode: 'remote' };
  }

  async getSignedDownloadUrl(key: string, expiresInSeconds = 900) {
    const record = await this.prisma.uploadRecord.findUnique({ where: { storageKey: key } });
    if (record && record.status !== 'VERIFIED') {
      throw new UnauthorizedException('Upload is not verified');
    }
    if (record?.retentionUntil && record.retentionUntil <= new Date()) {
      throw new NotFoundException('File retention period has ended');
    }
    if (!record && this.config.get<string>('NODE_ENV') === 'production') {
      throw new UnauthorizedException('Upload verification state is unavailable');
    }

    if (this.objectConfig()) {
      const { client, bucket } = this.s3();
      return getSignedUrl(
        client,
        new GetObjectCommand({ Bucket: bucket, Key: key }),
        { expiresIn: expiresInSeconds },
      );
    }
    const exp = Math.floor(Date.now() / 1000) + expiresInSeconds;
    const body = Buffer.from(JSON.stringify({ k: key, exp })).toString('base64url');
    const sig = createHmac('sha256', this.signingSecret()).update(body).digest('base64url');
    return `${this.publicApiBase()}/storage/${body}.${sig}`;
  }

  async openDownload(token: string): Promise<{
    stream: Readable;
    mimeType: string;
    fileName: string;
    size: number;
  }> {
    const [body, sig] = token.split('.');
    if (!body || !sig) throw new UnauthorizedException('Invalid download token');
    const expected = createHmac('sha256', this.signingSecret()).update(body).digest('base64url');
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      throw new UnauthorizedException('Invalid download token');
    }
    let payload: { k?: string; exp?: number };
    try {
      payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as {
        k?: string;
        exp?: number;
      };
    } catch {
      throw new UnauthorizedException('Invalid download token');
    }
    if (!payload.k || typeof payload.exp !== 'number') {
      throw new UnauthorizedException('Invalid download token');
    }
    if (payload.exp < Math.floor(Date.now() / 1000)) {
      throw new UnauthorizedException('Download link expired');
    }
    const record = await this.prisma.uploadRecord.findUnique({
      where: { storageKey: payload.k },
    });
    if (record && record.status !== 'VERIFIED') {
      throw new UnauthorizedException('Upload is not verified');
    }
    const filePath = this.absolutePath(payload.k);
    try {
      await access(filePath);
    } catch {
      throw new NotFoundException('File not found');
    }
    let meta: FileMeta = {
      mimeType: 'application/octet-stream',
      fileName: payload.k.split('/').pop() || 'download',
      size: 0,
    };
    try {
      meta = { ...meta, ...(JSON.parse(await readFile(this.metaPath(filePath), 'utf8')) as FileMeta) };
    } catch {
      // Metadata is optional for pre-migration local files.
    }
    return {
      stream: createReadStream(filePath),
      mimeType: meta.mimeType,
      fileName: meta.fileName,
      size: meta.size,
    };
  }

  async deleteQuarantinedLocal(key: string) {
    if (this.objectConfig()) return;
    try {
      await unlink(this.absolutePath(key));
    } catch {
      // Quarantine cleanup is best effort; status remains auditable in the database.
    }
  }

  async purgeExpired(limit = 200, organisationId?: string) {
    const rows = await this.prisma.uploadRecord.findMany({
      where: {
        ...(organisationId ? { organisationId } : {}),
        retentionUntil: { lte: new Date() },
        status: { in: ['VERIFIED', 'REJECTED', 'FAILED'] },
      },
      take: Math.min(Math.max(limit, 1), 1000),
      orderBy: { retentionUntil: 'asc' },
    });
    let purged = 0;
    for (const row of rows) {
      const keys = [row.storageKey, row.quarantineKey].filter(
        (key): key is string => Boolean(key),
      );
      try {
        if (this.objectConfig()) {
          const { client, bucket } = this.s3();
          for (const key of keys) {
            await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
          }
        } else {
          for (const key of keys) {
            const path = this.absolutePath(key);
            await unlink(path).catch(() => undefined);
            await unlink(this.metaPath(path)).catch(() => undefined);
          }
        }
        await this.prisma.uploadRecord.update({
          where: { id: row.id },
          data: {
            status: 'PURGED',
            storageKey: null,
            quarantineKey: null,
            failureReason: null,
          },
        });
        purged += 1;
      } catch (error) {
        this.logger.error(
          `Retention purge failed for upload ${row.id}: ${
            error instanceof Error ? error.message : 'unknown error'
          }`,
        );
      }
    }
    return { examined: rows.length, purged };
  }
}
