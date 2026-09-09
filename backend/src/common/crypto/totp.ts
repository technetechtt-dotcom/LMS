import { createHmac, timingSafeEqual } from 'crypto';

const BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function encodeBase32(bytes: Buffer): string {
  let bits = '';
  for (const byte of bytes) bits += byte.toString(2).padStart(8, '0');
  let result = '';
  for (let index = 0; index < bits.length; index += 5) {
    const chunk = bits.slice(index, index + 5).padEnd(5, '0');
    result += BASE32[Number.parseInt(chunk, 2)];
  }
  return result;
}

function decodeBase32(value: string): Buffer {
  const clean = value.toUpperCase().replace(/[^A-Z2-7]/g, '');
  let bits = '';
  for (const char of clean) {
    const index = BASE32.indexOf(char);
    if (index < 0) throw new Error('Invalid base32 secret');
    bits += index.toString(2).padStart(5, '0');
  }
  const bytes: number[] = [];
  for (let index = 0; index + 8 <= bits.length; index += 8) {
    bytes.push(Number.parseInt(bits.slice(index, index + 8), 2));
  }
  return Buffer.from(bytes);
}

export function totpCode(secret: string, at = Date.now(), stepSeconds = 30): string {
  const counter = Math.floor(at / 1000 / stepSeconds);
  const input = Buffer.alloc(8);
  input.writeBigUInt64BE(BigInt(counter));
  const digest = createHmac('sha1', decodeBase32(secret)).update(input).digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const value = (
    ((digest[offset] & 0x7f) << 24)
    | ((digest[offset + 1] & 0xff) << 16)
    | ((digest[offset + 2] & 0xff) << 8)
    | (digest[offset + 3] & 0xff)
  ) % 1_000_000;
  return value.toString().padStart(6, '0');
}

export function verifyTotp(secret: string, supplied: string, at = Date.now()): boolean {
  if (!/^\d{6}$/.test(supplied)) return false;
  for (const drift of [-1, 0, 1]) {
    const expected = totpCode(secret, at + drift * 30_000);
    if (timingSafeEqual(Buffer.from(expected), Buffer.from(supplied))) return true;
  }
  return false;
}
