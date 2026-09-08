import { AuthService } from './auth.service';

describe('AuthService', () => {
  const refreshToken = { findFirst: jest.fn() };
  const service = new AuthService(
    { refreshToken } as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
  );

  beforeEach(() => jest.clearAllMocks());

  it('does not enforce account switching on login', async () => {
    refreshToken.findFirst.mockResolvedValue({
      user: { email: 'current@example.com' },
    });

    await expect(
      service.login({ email: 'next@example.com', password: 'any' } as never),
    ).rejects.toThrow();
  });
});
