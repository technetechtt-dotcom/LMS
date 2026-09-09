import { encodeBase32, totpCode, verifyTotp } from './totp';

describe('RFC 6238 TOTP', () => {
  const secret = encodeBase32(Buffer.from('12345678901234567890'));

  it('matches the RFC SHA-1 test vector truncated to six digits', () => {
    expect(totpCode(secret, 59_000)).toBe('287082');
  });

  it('accepts only six digits in the adjacent time window', () => {
    const now = 1_700_000_000_000;
    expect(verifyTotp(secret, totpCode(secret, now), now)).toBe(true);
    expect(verifyTotp(secret, totpCode(secret, now - 30_000), now)).toBe(true);
    expect(verifyTotp(secret, '12345', now)).toBe(false);
    expect(verifyTotp(secret, '000000', now)).toBe(false);
  });
});
