import { createHmac, timingSafeEqual } from 'crypto';
import { createReadStream } from 'fs';
import { access, mkdir, readFile, writeFile } from 'fs/promises';
import { dirname, resolve, sep } from 'path';
import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  PayloadTooLargeException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

type StoredFile = {
  key: string;
  bucket: 'local';
  mimeType: string;
  size: number;
  url: string;
  provider: 'local';
};

type FileMeta = {
  mimeType: string;
  fileName: string;
  size: number;
};

@Injectable()
export class FileStorageService {
  private readonly logger = new Logger(FileStorageService.name);

  constructor(private readonly config: ConfigService) {}

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

  storageLocator(key: string, _bucket?: string) {
    return `storage://local/${key}`;
  }

  /**
   * Reject client-forged keys. Accepted forms:
   * - Exact key previously returned by upload (prefix/org/…)
   * - storage://local/key locator
   */
  assertValidStorageKey(
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
  ): string {
    let key = storageKey.trim();
    if (key.startsWith('storage://')) {
      const without = key.slice('storage://'.length);
      const slash = without.indexOf('/');
      key = slash >= 0 ? without.slice(slash + 1) : without;
    }
    if (!key || key.includes('..') || key.startsWith('/')) {
      throw new BadRequestException('Invalid storageKey');
    }
    const okPrefix = allowedPrefixes.some(
      (p) => key.startsWith(`${p}/`) || key.startsWith(`${p}\\`),
    );
    if (!okPrefix) {
      throw new BadRequestException(
        'storageKey must be a server-issued upload key',
      );
    }
    if (!key.includes(organisationId) && !key.startsWith('exports/')) {
      const hasOrg = allowedPrefixes.some((p) =>
        key.startsWith(`${p}/${organisationId}/`),
      );
      if (!hasOrg && !key.startsWith('exports/')) {
        const nodeEnv = this.config.get<string>('NODE_ENV') ?? 'development';
        if (nodeEnv === 'production') {
          throw new BadRequestException(
            'storageKey must belong to the active organisation',
          );
        }
      }
    }
    return key;
  }

  async upload(
    fileName: string,
    bytes: Buffer,
    mimeType: string,
    opts?: { prefix?: string; organisationId?: string },
  ): Promise<StoredFile> {
    const maxMb = Number(this.config.get<string>('UPLOAD_MAX_MB') ?? '25');
    if (bytes.length > maxMb * 1024 * 1024) {
      throw new PayloadTooLargeException(`File exceeds ${maxMb}MB`);
    }

    const prefix = opts?.prefix ?? 'uploads';
    const orgPart = opts?.organisationId ? `${opts.organisationId}/` : '';
    const key = `${prefix}/${orgPart}${Date.now()}-${fileName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const filePath = this.absolutePath(key);
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, bytes);
    const meta: FileMeta = {
      mimeType: mimeType || 'application/octet-stream',
      fileName,
      size: bytes.length,
    };
    await writeFile(this.metaPath(filePath), JSON.stringify(meta), 'utf8');
    this.logger.log(`Stored local file ${key}`);
    return {
      key,
      bucket: 'local',
      mimeType: meta.mimeType,
      size: bytes.length,
      url: this.storageLocator(key),
      provider: 'local',
    };
  }

  async getSignedDownloadUrl(key: string, expiresInSeconds = 900) {
    const exp = Math.floor(Date.now() / 1000) + expiresInSeconds;
    const body = Buffer.from(JSON.stringify({ k: key, exp })).toString(
      'base64url',
    );
    const sig = createHmac('sha256', this.signingSecret())
      .update(body)
      .digest('base64url');
    return `${this.publicApiBase()}/storage/${body}.${sig}`;
  }

  async openDownload(token: string): Promise<{
    stream: ReturnType<typeof createReadStream>;
    mimeType: string;
    fileName: string;
    size: number;
  }> {
    const [body, sig] = token.split('.');
    if (!body || !sig) {
      throw new UnauthorizedException('Invalid download token');
    }
    const expected = createHmac('sha256', this.signingSecret())
      .update(body)
      .digest('base64url');
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
      const raw = await readFile(this.metaPath(filePath), 'utf8');
      meta = { ...meta, ...(JSON.parse(raw) as FileMeta) };
    } catch {
      /* metadata is optional for older files */
    }

    return {
      stream: createReadStream(filePath),
      mimeType: meta.mimeType,
      fileName: meta.fileName,
      size: meta.size,
    };
  }
}
