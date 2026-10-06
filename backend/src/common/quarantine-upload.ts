import {
  BadRequestException,
  PayloadTooLargeException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { diskStorage } from 'multer';
import type { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { mkdirSync, readdirSync, statSync, unlinkSync } from 'fs';
import { unlink } from 'fs/promises';
import { randomUUID } from 'crypto';
import { resolve, join } from 'path';
import type { Request } from 'express';
import type { FileFilterCallback } from 'multer';

export type StagedUploadFile = Express.Multer.File & { path: string };

let activeUploads = 0;

export function getActiveUploadCount(): number {
  return activeUploads;
}

export function resetActiveUploadCount(): void {
  activeUploads = 0;
}

export function cleanOrphanedQuarantineFiles(
  maxAgeMs = 15 * 60 * 1000,
  targetDir?: string,
): number {
  const dir =
    targetDir ??
    resolve(process.env.UPLOAD_DIR?.trim() || 'uploads', 'quarantine', 'incoming');
  try {
    const files = readdirSync(dir);
    const now = Date.now();
    let cleaned = 0;
    for (const file of files) {
      try {
        const full = join(dir, file);
        const stats = statSync(full);
        if (stats.isFile() && now - stats.mtimeMs > maxAgeMs) {
          unlinkSync(full);
          cleaned += 1;
        }
      } catch {
        // ignore errors
      }
    }
    return cleaned;
  } catch {
    return 0;
  }
}

const forbiddenExtensions = new Set([
  '.app', '.apk', '.bat', '.bin', '.bz2', '.cmd', '.com', '.cpl', '.dll',
  '.dmg', '.docm', '.exe', '.gz', '.hta', '.iso', '.jar', '.js', '.jse',
  '.lnk', '.mjs', '.msi', '.php', '.pl', '.ps1', '.py', '.rar', '.rb',
  '.reg', '.scr', '.sh', '.tar', '.vb', '.vbe', '.vbs', '.wsf', '.xlam',
  '.xlsm', '.pptm', '.zip', '.7z',
]);

export function originalExtension(name: string): string {
  const match = /(?:^|[^.])(\.[a-z0-9]{1,12})$/i.exec(name.trim());
  return match?.[1]?.toLowerCase() ?? '';
}

export function assertAllowedUploadName(name: string): void {
  const ext = originalExtension(name);
  if (forbiddenExtensions.has(ext)) {
    throw new BadRequestException('Executable, script, macro, or archive uploads are not supported');
  }
  if (name.includes('\0') || name.length > 255) {
    throw new BadRequestException('Invalid upload filename');
  }
}

export function quarantineUploadOptions(options?: {
  maxMb?: number;
  maxFiles?: number;
  maxFields?: number;
  maxConcurrent?: number;
  timeoutMs?: number;
}): MulterOptions {
  const maxMb = options?.maxMb ?? Number(process.env.UPLOAD_MAX_MB ?? '25');
  const maxFiles = options?.maxFiles ?? 1;
  const maxFields = options?.maxFields ?? 10;
  const maxConcurrent =
    options?.maxConcurrent ?? Number(process.env.MAX_CONCURRENT_UPLOADS ?? '25');
  const timeoutMs =
    options?.timeoutMs ?? Number(process.env.UPLOAD_TIMEOUT_MS ?? '60000');
  const destination = resolve(
    process.env.UPLOAD_DIR?.trim() || 'uploads',
    'quarantine',
    'incoming',
  );
  mkdirSync(destination, { recursive: true });

  const writtenFiles = new WeakMap<Request, string[]>();

  return {
    storage: diskStorage({
      destination,
      filename: (req: Request, _file, cb) => {
        const name = randomUUID();
        const fullPath = resolve(destination, name);
        const tracked = writtenFiles.get(req) || [];
        tracked.push(fullPath);
        writtenFiles.set(req, tracked);
        cb(null, name);
      },
    }),
    limits: {
      fileSize: maxMb * 1024 * 1024,
      files: maxFiles,
      fields: maxFields,
      fieldNameSize: 64,
      fieldSize: 64 * 1024,
      parts: maxFiles + maxFields,
      headerPairs: 64,
    },
    fileFilter: (
      req: Request,
      file: Express.Multer.File,
      cb: FileFilterCallback,
    ) => {
      try {
        if (activeUploads >= maxConcurrent) {
          cb(
            new ServiceUnavailableException(
              'Upload concurrency limit reached; please retry shortly',
            ) as unknown as null,
            false,
          );
          return;
        }
        assertAllowedUploadName(file.originalname);

        type TrackedRequest = Request & {
          _uploadTrackingRegistered?: boolean;
          _uploadTrackedActive?: boolean;
        };
        const trackedReq = req as TrackedRequest;

        if (!trackedReq._uploadTrackingRegistered) {
          trackedReq._uploadTrackingRegistered = true;
          activeUploads += 1;

          if (timeoutMs > 0 && typeof trackedReq.setTimeout === 'function') {
            trackedReq.setTimeout(timeoutMs, () => {
              const files = writtenFiles.get(req) || [];
              for (const path of files) {
                unlink(path).catch(() => undefined);
              }
              if (!trackedReq.destroyed) {
                trackedReq.destroy(new Error('Upload request timed out'));
              }
            });
          }

          const cleanup = () => {
            if (trackedReq._uploadTrackedActive) {
              trackedReq._uploadTrackedActive = false;
              activeUploads = Math.max(0, activeUploads - 1);
            }
          };

          trackedReq._uploadTrackedActive = true;
          trackedReq.on('finish', cleanup);
          trackedReq.on('error', () => {
            cleanup();
            const files = writtenFiles.get(req) || [];
            for (const path of files) {
              unlink(path).catch(() => undefined);
            }
          });
          trackedReq.on('aborted', () => {
            cleanup();
            const files = writtenFiles.get(req) || [];
            for (const path of files) {
              unlink(path).catch(() => undefined);
            }
          });
          trackedReq.on('close', () => {
            cleanup();
            if (!trackedReq.complete) {
              const files = writtenFiles.get(req) || [];
              for (const path of files) {
                unlink(path).catch(() => undefined);
              }
            }
          });
        }

        cb(null, true);
      } catch (error) {
        cb(error as Error);
      }
    },
  } as unknown as MulterOptions;
}

/** Reject known-size multipart bodies before Multer starts consuming the stream. */
export function enforceMultipartRequestSize(
  contentType: string | undefined,
  contentLength: string | undefined,
): void {
  if (!contentType?.toLowerCase().startsWith('multipart/form-data')) return;
  const maxMb = Number(process.env.UPLOAD_TOTAL_MAX_MB ?? '52');
  const maxBytes = maxMb * 1024 * 1024;
  const parsed = Number(contentLength);
  if (Number.isFinite(parsed) && parsed > maxBytes) {
    throw new PayloadTooLargeException(`Multipart request exceeds ${maxMb}MB`);
  }
}
