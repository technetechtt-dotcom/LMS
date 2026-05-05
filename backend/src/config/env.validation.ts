/** Validates process.env-derived config from @nestjs/config. */
export function validateEnv(
  cfg: Record<string, unknown>,
): Record<string, unknown> {
  const nodeEnv =
    typeof cfg.NODE_ENV === 'string' ? cfg.NODE_ENV : 'development';
  const errs: string[] = [];

  if (nodeEnv === 'production') {
    const secret = cfg.JWT_SECRET;
    const s =
      typeof secret === 'string' ? secret.trim() : String(secret ?? '');
    if (
      !s ||
      s === 'change-me' ||
      s === 'change-me-to-strong-secret' ||
      s.length < 32
    ) {
      errs.push(
        'JWT_SECRET must be set (min 32 chars) and not a default placeholder in NODE_ENV=production',
      );
    }
    const front =
      typeof cfg.FRONTEND_ORIGIN === 'string' ? cfg.FRONTEND_ORIGIN.trim() : '';
    if (!front) {
      errs.push(
        'FRONTEND_ORIGIN must list allowed browser origins (comma-separated) in production',
      );
    }
  }

  if (errs.length) {
    throw new Error(`Invalid environment configuration:\n- ${errs.join('\n- ')}`);
  }
  return cfg;
}
