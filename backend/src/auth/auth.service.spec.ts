import { ConflictException } from '@nestjs/common';
import { AuthService } from './auth.service';

describe('AuthService account switching', () => {
  const refreshToken = { findFirst: jest.fn() };
  const service = new AuthService(
    { refreshToken } as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
  );

  beforeEach(() => jest.clearAllMocks());

  it('allows login when the browser has no active session', async () => {
    await expect(
      service.assertAccountSwitchAllowed('next@example.com', []),
    ).resolves.toBeUndefined();
    expect(refreshToken.findFirst).not.toHaveBeenCalled();
  });

  it('allows the active account to authenticate again', async () => {
    refreshToken.findFirst.mockResolvedValue({
      user: { email: 'same@example.com' },
    });

    await expect(
      service.assertAccountSwitchAllowed('SAME@example.com', ['refresh-token']),
    ).resolves.toBeUndefined();
  });

  it('requires logout before a different account can authenticate', async () => {
    refreshToken.findFirst.mockResolvedValue({
      user: { email: 'current@example.com' },
    });

    await expect(
      service.assertAccountSwitchAllowed('next@example.com', ['refresh-token']),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
