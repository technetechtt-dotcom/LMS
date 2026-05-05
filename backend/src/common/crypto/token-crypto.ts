import { createHash, randomBytes } from 'crypto';

export function generateOpaqueRefreshToken(): string {
  return randomBytes(48).toString('base64url');
}

/** SHA-256 hex digest for persisted lookup (opaque token never stored raw). */
export function hashOpaqueToken(raw: string): string {
  return createHash('sha256').update(raw, 'utf8').digest('hex');
}
