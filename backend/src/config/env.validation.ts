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
    } else if (!str('DIRECT_URL')) {
      cfg.DIRECT_URL = str('DATABASE_URL');
    }

    if ((str('PUBLIC_REGISTRATION') || '').toLowerCase() === 'true') {
      errs.push('PUBLIC_REGISTRATION cannot be enabled in production — use invitations');
    }
    if ((str('ADMIN_ENDPOINTS_ENABLED') || '').toLowerCase() !== 'true') {
      errs.push('ADMIN_ENDPOINTS_ENABLED must be true so authorised provisioning remains available');
    }

    for (const key of [
      'OBJECT_STORAGE_ENDPOINT',
      'OBJECT_STORAGE_BUCKET',
      'OBJECT_STORAGE_REGION',
      'OBJECT_STORAGE_ACCESS_KEY_ID',
      'OBJECT_STORAGE_SECRET_ACCESS_KEY',
    ]) {
      if (!str(key)) errs.push(`${key} is required for durable production uploads`);
    }

    for (const key of ['MAIL_DELIVERY_URL', 'MALWARE_SCAN_URL']) {
      const value = str(key);
      if (!value || !value.toLowerCase().startsWith('https://')) {
        errs.push(`${key} must be an HTTPS URL in production`);
      }
    }
  }

  if (errs.length) {
    throw new Error(`Invalid environment configuration:\n- ${errs.join('\n- ')}`);
  }
  return cfg;
}
