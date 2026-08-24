/** Validates process.env-derived config from @nestjs/config. */
export function validateEnv(
  cfg: Record<string, unknown>,
): Record<string, unknown> {
  const nodeEnv =
    typeof cfg.NODE_ENV === 'string' ? cfg.NODE_ENV : 'development';
  const errs: string[] = [];
  const str = (key: string) =>
    typeof cfg[key] === 'string' ? (cfg[key] as string).trim() : '';

  if (nodeEnv === 'production') {
    const secret = str('JWT_SECRET');
    if (
      !secret ||
      secret === 'change-me' ||
      secret === 'change-me-to-strong-secret' ||
      secret === 'skillforge-dev-jwt-secret-change-in-production-32' ||
      secret.length < 32
    ) {
      errs.push(
        'JWT_SECRET must be set (min 32 chars) and not a default placeholder in NODE_ENV=production',
      );
    }

    if (!str('FRONTEND_ORIGIN')) {
      errs.push(
        'FRONTEND_ORIGIN must list allowed browser origins (comma-separated) in production',
      );
    }

    if (!str('DATABASE_URL')) {
      errs.push('DATABASE_URL is required in production');
    }

    if (!str('DIRECT_URL')) {
      errs.push(
        'DIRECT_URL is required in production (Neon direct URL for migrations; may match DATABASE_URL for non-pooled hosts)',
      );
    }

    const logReset = str('LOG_PASSWORD_RESET_LINK').toLowerCase();
    if (logReset === 'true' || logReset === '1') {
      errs.push(
        'LOG_PASSWORD_RESET_LINK must not be enabled in production — configure SMTP/mail delivery instead',
      );
    }

    const fileMode = (str('FILE_STORAGE') || 's3').toLowerCase();
    if (fileMode === 'mock') {
      errs.push('FILE_STORAGE=mock is not allowed in production — use real S3');
    }
    {
      const access = str('AWS_ACCESS_KEY_ID').toLowerCase();
      const secretKey = str('AWS_SECRET_ACCESS_KEY').toLowerCase();
      const bucket = str('AWS_S3_BUCKET');
      if (
        !bucket ||
        bucket === 'mock-bucket' ||
        !access ||
        access === 'mock' ||
        !secretKey ||
        secretKey === 'mock'
      ) {
        errs.push(
          'Production file storage requires real AWS_S3_BUCKET, AWS_ACCESS_KEY_ID, and AWS_SECRET_ACCESS_KEY',
        );
      }
    }

    const mailProvider = (str('MAIL_PROVIDER') || '').toLowerCase();
    if (mailProvider !== 'smtp') {
      errs.push('MAIL_PROVIDER must be smtp in production (log/mock mail is not allowed)');
    }
    if (!str('SMTP_HOST') || !str('SMTP_FROM')) {
      errs.push('SMTP_HOST and SMTP_FROM are required in production');
    }

    if ((str('PUBLIC_REGISTRATION') || '').toLowerCase() === 'true') {
      errs.push('PUBLIC_REGISTRATION cannot be enabled in production — use invitations');
    }

    const avMode = (str('AV_SCAN_MODE') || '').toLowerCase();
    if (!avMode || avMode === 'mock' || avMode === 'off') {
      errs.push(
        'AV_SCAN_MODE must be "http" in production (mock/off are not allowed)',
      );
    }
    if (!str('AV_SCAN_URL')) {
      errs.push('AV_SCAN_URL is required in production');
    }

    const adminEndpoints = (str('ADMIN_ENDPOINTS_ENABLED') || 'false').toLowerCase();
    if (adminEndpoints === 'true' || adminEndpoints === '1') {
      // allowed but noisy — prefer explicit false; no hard fail
    }
  }

  if (errs.length) {
    throw new Error(`Invalid environment configuration:\n- ${errs.join('\n- ')}`);
  }
  return cfg;
}
