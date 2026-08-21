import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AntivirusService } from './antivirus.service';

function isMockCredential(value: string | undefined): boolean {
  if (!value || !value.trim()) return true;
  const v = value.trim().toLowerCase();
  return v === 'mock' || v === 'test' || v === 'local';
}

@Injectable()
export class FileStorageService {
  private readonly logger = new Logger(FileStorageService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly antivirus: AntivirusService,
  ) {}

  private s3Config() {
    const nodeEnv = this.config.get<string>('NODE_ENV') ?? 'development';
    const fileMode = (this.config.get<string>('FILE_STORAGE') ?? 's3')
      .trim()
      .toLowerCase();
    const bucket =
      this.config.get<string>('AWS_S3_BUCKET', 'mock-bucket') ?? 'mock-bucket';
    const region = this.config.get<string>('AWS_REGION', 'af-south-1');
    const accessKeyId =
      this.config.get<string>('AWS_ACCESS_KEY_ID', '') ?? '';
    const secretAccessKey =
      this.config.get<string>('AWS_SECRET_ACCESS_KEY', '') ?? '';
    const useS3 =
      fileMode !== 'mock' &&
      !isMockCredential(accessKeyId) &&
      !isMockCredential(secretAccessKey) &&
      bucket !== 'mock-bucket';
    return { nodeEnv, fileMode, bucket, region, accessKeyId, secretAccessKey, useS3 };
  }

  private client(cfg: ReturnType<FileStorageService['s3Config']>) {
    return new S3Client({
      region: cfg.region,
      credentials: {
        accessKeyId: cfg.accessKeyId.trim(),
        secretAccessKey: cfg.secretAccessKey.trim(),
      },
    });
  }

  async upload(
    fileName: string,
    bytes: Buffer,
    mimeType: string,
    opts?: { prefix?: string; organisationId?: string },
  ) {
    await this.antivirus.scanOrThrow(fileName, bytes);

    const cfg = this.s3Config();
    const prefix = opts?.prefix ?? 'uploads';
    const orgPart = opts?.organisationId ? `${opts.organisationId}/` : '';
    const key = `${prefix}/${orgPart}${Date.now()}-${fileName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;

    if (!cfg.useS3) {
      if (cfg.nodeEnv === 'production' && cfg.fileMode !== 'mock') {
        throw new ServiceUnavailableException(
          'File storage is not configured for production',
        );
      }
      return {
        key,
        bucket: cfg.bucket,
        mimeType,
        size: bytes.length,
        url: `https://${cfg.bucket}.s3.${cfg.region}.amazonaws.com/${encodeURI(key)}`,
        provider: 'mock-s3' as const,
      };
    }

    const client = this.client(cfg);
    await client.send(
      new PutObjectCommand({
        Bucket: cfg.bucket,
        Key: key,
        Body: bytes,
        ContentType: mimeType || 'application/octet-stream',
        ServerSideEncryption: 'AES256',
        // Private objects — use signed URLs for download
        ACL: undefined,
      }),
    );

    const url = await this.getSignedDownloadUrl(key, 3600);
    this.logger.log(`Uploaded s3://${cfg.bucket}/${key}`);
    return {
      key,
      bucket: cfg.bucket,
      mimeType,
      size: bytes.length,
      url,
      provider: 's3' as const,
    };
  }

  async getSignedDownloadUrl(key: string, expiresInSeconds = 900) {
    const cfg = this.s3Config();
    if (!cfg.useS3) {
      return `https://${cfg.bucket}.s3.${cfg.region}.amazonaws.com/${encodeURI(key)}`;
    }
    const client = this.client(cfg);
    return getSignedUrl(
      client as never,
      new GetObjectCommand({ Bucket: cfg.bucket, Key: key }),
      { expiresIn: expiresInSeconds },
    );
  }
}
