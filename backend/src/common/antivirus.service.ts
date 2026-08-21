import {
  Injectable,
  Logger,
  PayloadTooLargeException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Antivirus gate for uploads.
 * - AV_SCAN_MODE=off|mock|http (default: mock in non-prod, http if AV_SCAN_URL set)
 * - AV_SCAN_URL: POST multipart/binary endpoint that returns { clean: boolean }
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

    const mode = (
      this.config.get<string>('AV_SCAN_MODE') ??
      (this.config.get<string>('AV_SCAN_URL') ? 'http' : 'mock')
    )
      .trim()
      .toLowerCase();

    if (mode === 'off') return;

    if (mode === 'mock') {
      // Deterministic fail for EICAR test string
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
    }

    this.logger.warn(`Unknown AV_SCAN_MODE=${mode}; allowing upload`);
  }
}
