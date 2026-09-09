import { validateEnv } from './env.validation';

const productionConfig = (overrides: Record<string, unknown> = {}) => ({
  NODE_ENV: 'production',
  JWT_SECRET: 'a-production-secret-that-is-at-least-32-characters',
  FRONTEND_ORIGIN: 'https://lms.example.com',
  DATABASE_URL: 'postgresql://runtime.example/db',
  ADMIN_ENDPOINTS_ENABLED: 'true',
  PUBLIC_REGISTRATION: 'false',
  ...overrides,
});

describe('validateEnv', () => {
  it('allows the API to start without optional integration endpoints', () => {
    const config = productionConfig();

    expect(validateEnv(config)).toBe(config);
    expect(config).toMatchObject({
      DIRECT_URL: 'postgresql://runtime.example/db',
    });
  });

  it('rejects a partially configured object-storage integration', () => {
    expect(() =>
      validateEnv(
        productionConfig({
          OBJECT_STORAGE_ENDPOINT: 'https://objects.example.com',
          OBJECT_STORAGE_BUCKET: 'private-evidence',
        }),
      ),
    ).toThrow('OBJECT_STORAGE_REGION is required when object storage is configured');
  });

  it('requires configured integration endpoints to use HTTPS', () => {
    expect(() =>
      validateEnv(
        productionConfig({
          MAIL_DELIVERY_URL: 'http://mail.example.com/deliver',
          MALWARE_SCAN_URL: 'http://scanner.example.com/scan',
        }),
      ),
    ).toThrow('MAIL_DELIVERY_URL must be an HTTPS URL in production');
  });

  it('accepts fully configured production integrations', () => {
    expect(() =>
      validateEnv(
        productionConfig({
          OBJECT_STORAGE_ENDPOINT: 'https://objects.example.com',
          OBJECT_STORAGE_BUCKET: 'private-evidence',
          OBJECT_STORAGE_REGION: 'us-east-1',
          OBJECT_STORAGE_ACCESS_KEY_ID: 'access-key',
          OBJECT_STORAGE_SECRET_ACCESS_KEY: 'secret-key',
          MAIL_DELIVERY_URL: 'https://mail.example.com/deliver',
          MALWARE_SCAN_URL: 'https://scanner.example.com/scan',
        }),
      ),
    ).not.toThrow();
  });
});
