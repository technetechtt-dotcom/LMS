-- Test fixtures created against the production database cannot remain active accounts.
UPDATE "User"
SET "isActive" = FALSE
WHERE "deletedAt" IS NULL
  AND lower(split_part("email", '@', 2)) IN ('e2e.test', 'example.test', 't.test');

UPDATE "RefreshToken"
SET "revokedAt" = CURRENT_TIMESTAMP
WHERE "revokedAt" IS NULL
  AND "userId" IN (
    SELECT "id" FROM "User"
    WHERE "isActive" = FALSE
      AND lower(split_part("email", '@', 2)) IN ('e2e.test', 'example.test', 't.test')
  );
