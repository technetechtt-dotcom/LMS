import { BadRequestException, PayloadTooLargeException } from '@nestjs/common';
import { diskStorage } from 'multer';
import type { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { mkdirSync } from 'fs';
import { randomUUID } from 'crypto';
import { resolve } from 'path';
import type { Request } from 'express';
import type { FileFilterCallback } from 'multer';

export type StagedUploadFile = Express.Multer.File & { path: string };

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
}): MulterOptions {
  const maxMb = options?.maxMb ?? Number(process.env.UPLOAD_MAX_MB ?? '25');
  const maxFiles = options?.maxFiles ?? 1;
  const maxFields = options?.maxFields ?? 10;
  const destination = resolve(
    process.env.UPLOAD_DIR?.trim() || 'uploads',
    'quarantine',
    'incoming',
  );
  mkdirSync(destination, { recursive: true });
  return {
    storage: diskStorage({
      destination,
      filename: (_req, _file, cb) => cb(null, randomUUID()),
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
      _req: Request,
      file: Express.Multer.File,
      cb: FileFilterCallback,
    ) => {
      try {
        assertAllowedUploadName(file.originalname);
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
