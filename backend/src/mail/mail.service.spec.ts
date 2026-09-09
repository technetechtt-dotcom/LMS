import { ConfigService } from '@nestjs/config';
import { ServiceUnavailableException } from '@nestjs/common';
import { MailService } from './mail.service';

describe('MailService readiness', () => {
  const serviceFor = (values: Record<string, string | undefined>) =>
    new MailService({
      get: jest.fn((key: string) => values[key]),
    } as unknown as ConfigService);

  afterEach(() => jest.restoreAllMocks());

  it('requires both delivery and health endpoints in production', async () => {
    const service = serviceFor({
      NODE_ENV: 'production',
      MAIL_DELIVERY_URL: 'https://mail.example.test/send',
    });

    await expect(service.availabilityStatus()).resolves.toEqual({
      ok: false,
      provider: 'unconfigured',
    });
  });

  it('probes the provider with bounded authenticated health requests', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({ ok: true } as Response);
    const service = serviceFor({
      NODE_ENV: 'production',
      MAIL_DELIVERY_URL: 'https://mail.example.test/send',
      MAIL_DELIVERY_HEALTH_URL: 'https://mail.example.test/health',
      MAIL_DELIVERY_TOKEN: 'provider-token',
    });

    await expect(service.availabilityStatus()).resolves.toEqual({
      ok: true,
      provider: 'https-webhook',
    });
    expect(fetchMock).toHaveBeenCalledWith('https://mail.example.test/health', {
      method: 'GET',
      headers: { Authorization: 'Bearer provider-token' },
      signal: expect.any(AbortSignal),
    });
  });

  it('fails readiness when the provider health endpoint is unhealthy', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({ ok: false, status: 503 } as Response);
    const service = serviceFor({
      NODE_ENV: 'production',
      MAIL_DELIVERY_URL: 'https://mail.example.test/send',
      MAIL_DELIVERY_HEALTH_URL: 'https://mail.example.test/health',
    });

    await expect(service.availabilityStatus()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});
