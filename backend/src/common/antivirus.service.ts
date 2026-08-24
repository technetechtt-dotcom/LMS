import {
  Injectable,
  Logger,
  PayloadTooLargeException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Antivirus gate for uploads.
 * - AV_SCAN_MODE=off|mock|http
 * - Production: only http (real scanner); unavailable = reject (fail closed)
 */
@Injectable()
export class AntivirusService {
  private readonly logger = new Logger(AntivirusService.name);

  constructor(private readonly config: ConfigService) {}

  async scanOrThrow(fileName: string, bytes: Buffer): Promise<void> {
    const maxMb = Number(this.config.get<string>('UPLOAD_MAX_MB') ?? '25');
    if (bytes.length > maxMb * 1024 * 1024) {
      throw new PayloadTooLargeException(`File exceeds ${maxMb}MB`);
    }

    const nodeEnv = this.config.get<string>('NODE_ENV') ?? 'development';
    const mode = (
      this.config.get<string>('AV_SCAN_MODE') ??
      (this.config.get<string>('AV_SCAN_URL') ? 'http' : 'mock')
    )
      .trim()
      .toLowerCase();

    if (nodeEnv === 'production') {
      if (mode === 'off' || mode === 'mock') {
        throw new UnprocessableEntityException(
          'Production uploads require AV_SCAN_MODE=http with a working scanner',
        );
      }
      if (mode !== 'http') {
        throw new UnprocessableEntityException(
          `Unsupported AV_SCAN_MODE=${mode} in production`,
        );
      }
    }

    if (mode === 'off') return;

    if (mode === 'mock') {
      if (bytes.includes(Buffer.from('EICAR-STANDARD-ANTIVIRUS-TEST-FILE'))) {
        throw new UnprocessableEntityException('Malware detected (mock AV)');
      }
      return;
    }

    if (mode === 'http') {
      const url = this.config.get<string>('AV_SCAN_URL')?.trim();
      if (!url) {
        throw new UnprocessableEntityException('AV_SCAN_URL is not configured');
      }
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/octet-stream',
            'X-File-Name': fileName,
          },
          body: new Uint8Array(bytes),
        });
        if (!res.ok) {
          this.logger.error(`AV scan HTTP ${res.status}`);
          throw new UnprocessableEntityException('Antivirus scan failed');
        }
        const json = (await res.json()) as { clean?: boolean };
        if (json.clean !== true) {
          throw new UnprocessableEntityException('Malware detected');
        }
        return;
      } catch (err) {
        if (err instanceof UnprocessableEntityException) throw err;
        this.logger.error(`AV scan unavailable: ${String(err)}`);
        throw new UnprocessableEntityException(
          'Antivirus scanner unavailable — upload rejected',
        );
      }
    }

    this.logger.error(`Unknown AV_SCAN_MODE=${mode}; rejecting upload`);
    throw new UnprocessableEntityException(
      `Unknown AV_SCAN_MODE=${mode}; upload rejected`,
    );
  }
}
