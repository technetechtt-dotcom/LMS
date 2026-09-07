/** Neon pooled URLs still work for Prisma if DIRECT_URL is omitted. */
if (!process.env.DIRECT_URL?.trim() && process.env.DATABASE_URL?.trim()) {
  process.env.DIRECT_URL = process.env.DATABASE_URL.trim();
}
