import { generateOpaqueRefreshToken, hashOpaqueToken } from './token-crypto';

describe('token-crypto', () => {
  it('hashes deterministically', () => {
    const t = 'test-token';
    expect(hashOpaqueToken(t)).toBe(hashOpaqueToken(t));
    expect(hashOpaqueToken(t)).not.toBe(hashOpaqueToken(t + 'x'));
  });

  it('generates distinct opaque tokens', () => {
    const a = generateOpaqueRefreshToken();
    const b = generateOpaqueRefreshToken();
    expect(a.length).toBeGreaterThan(20);
    expect(a).not.toBe(b);
  });
});
