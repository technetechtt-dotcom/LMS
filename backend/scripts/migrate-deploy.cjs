/**
 * Apply Prisma migrations on Render/Neon without a start-command crash loop.
 * Neon computes can be cold; overlapping `migrate deploy` processes hold
 * pg_advisory_lock and fail with P1002 after 10s.
 */
const { execFileSync } = require('child_process');

function directUrl() {
  const raw = (
    process.env.DIRECT_URL ||
    process.env.DATABASE_URL ||
    ''
  ).trim();
  if (!raw) {
    throw new Error('DATABASE_URL or DIRECT_URL must be set');
  }
  return raw.replace('-pooler.', '.');
}

function withTimeout(url) {
  if (/[?&]connect_timeout=/.test(url)) return url;
  return url.includes('?')
    ? `${url}&connect_timeout=30`
    : `${url}?connect_timeout=30`;
}

async function waitForDatabase() {
  const { PrismaClient } = require('@prisma/client');
  let lastErr;
  for (let i = 1; i <= 8; i += 1) {
    const prisma = new PrismaClient();
    try {
      await prisma.$queryRaw`SELECT 1`;
      await prisma.$disconnect();
      return;
    } catch (err) {
      lastErr = err;
      await prisma.$disconnect().catch(() => undefined);
      const delay = Math.min(15_000, 2000 * i);
      console.warn(
        `Database not ready (attempt ${i}/8): ${err instanceof Error ? err.message : err}`,
      );
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastErr;
}

async function main() {
  const url = withTimeout(directUrl());
  process.env.DIRECT_URL = url;
  process.env.DATABASE_URL = url;
  await waitForDatabase();
  execFileSync('npx', ['prisma', 'migrate', 'deploy'], {
    stdio: 'inherit',
    env: process.env,
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
