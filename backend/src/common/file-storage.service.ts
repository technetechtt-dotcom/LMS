import { createHash, createHmac, timingSafeEqual } from 'crypto';
import { createReadStream } from 'fs';
import { access, mkdir, readFile, rename, unlink, writeFile } from 'fs/promises';
import { dirname, resolve, sep } from 'path';
import type { Readable } from 'stream';
import {
  CopyObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
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
    return this.config.get<string>('JWT_SECRET')?.trim() || 'local-file-secret';
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
    bytes: Buffer,
    metadata: { mimeType: string; sha256: string; size: number },
  ) {
    const endpoint = this.config.get<string>('MALWARE_SCAN_URL')?.trim();
    if (!endpoint) {
      if (this.config.get<string>('NODE_ENV') === 'production') {
        throw new BadRequestException('Malware scanning is not configured');
      }
      const marker = 'EICAR-STANDARD-ANTIVIRUS-TEST-FILE';
      return { clean: !bytes.toString('utf8').includes(marker), details: 'local-signature-scan' };
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
    opts?: { prefix?: string; organisationId?: string },
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
    const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_') || 'upload.bin';
    const unique = `${Date.now()}-${createHash('sha256').update(bytes).digest('hex').slice(0, 16)}`;
    const finalKey = `${prefix}/${orgPart}${unique}-${safeName}`;
    const quarantineKey = `quarantine/${orgPart}${unique}-${safeName}`;
    const sha256 = createHash('sha256').update(bytes).digest('hex');
    const retentionDays = Math.max(
      1,
      Number(this.config.get<string>('UPLOAD_RETENTION_DAYS') ?? '2555') || 2555,
    );
    const record = await this.prisma.uploadRecord.create({
      data: {
        organisationId: opts?.organisationId,
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
      const scanned = await this.scan(quarantineKey, bytes, {
        mimeType: mimeType || 'application/octet-stream',
        sha256,
        size: bytes.length,
      });
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
