import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

function isMockCredential(value: string | undefined): boolean {
  if (!value || !value.trim()) return true;
  const v = value.trim().toLowerCase();
  return v === 'mock' || v === 'test' || v === 'local';
}

@Injectable()
export class FileStorageService {
  private readonly logger = new Logger(FileStorageService.name);

  constructor(private readonly config: ConfigService) {}

  async upload(
    fileName: string,
    bytes: Buffer,
    mimeType: string,
    opts?: { prefix?: string; organisationId?: string },
  ) {
    const nodeEnv = this.config.get<string>('NODE_ENV') ?? 'development';
    const fileMode = (
      this.config.get<string>('FILE_STORAGE') ?? 's3'
    )
      .trim()
      .toLowerCase();

    const bucket =
      this.config.get<string>('AWS_S3_BUCKET', 'mock-bucket') ?? 'mock-bucket';
    const region = this.config.get<string>('AWS_REGION', 'af-south-1');
    const prefix = opts?.prefix ?? 'uploads';
    const orgPart = opts?.organisationId
      ? `${opts.organisationId}/`
      : '';
    const key = `${prefix}/${orgPart}${Date.now()}-${fileName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const accessKeyId =
      this.config.get<string>('AWS_ACCESS_KEY_ID', '') ?? '';
    const secretAccessKey =
      this.config.get<string>('AWS_SECRET_ACCESS_KEY', '') ?? '';

    const useS3 =
      fileMode !== 'mock' &&
      !isMockCredential(accessKeyId) &&
      !isMockCredential(secretAccessKey) &&
      bucket !== 'mock-bucket';

    if (!useS3) {
      if (nodeEnv === 'production' && fileMode !== 'mock') {
        throw new ServiceUnavailableException(
          'File storage is not configured for production',
        );
      }
      return {
        key,
        bucket,
        mimeType,
        size: bytes.length,
        url: `https://${bucket}.s3.${region}.amazonaws.com/${encodeURI(key)}`,
        provider: 'mock-s3' as const,
      };
    }

    const client = new S3Client({
      region,
      credentials: {
        accessKeyId: accessKeyId.trim(),
        secretAccessKey: secretAccessKey.trim(),
      },
    });

    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: bytes,
        ContentType: mimeType || 'application/octet-stream',
        ServerSideEncryption: 'AES256',
      }),
    );

    const url = `https://${bucket}.s3.${region}.amazonaws.com/${encodeURI(key)}`;
    this.logger.log(`Uploaded s3://${bucket}/${key}`);
    return {
      key,
      bucket,
      mimeType,
      size: bytes.length,
      url,
      provider: 's3' as const,
    };
  }
}
