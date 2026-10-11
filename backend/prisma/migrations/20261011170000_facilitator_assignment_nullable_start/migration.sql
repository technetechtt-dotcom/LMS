-- Align FacilitatorAssignment.startDate with Prisma schema (optional, no default).
-- A legacy DEFAULT CURRENT_TIMESTAMP caused Prisma to treat open allocations as
-- not-yet-started when the DB session timezone differed from UTC.
ALTER TABLE "FacilitatorAssignment" ALTER COLUMN "startDate" DROP DEFAULT;
ALTER TABLE "FacilitatorAssignment" ALTER COLUMN "startDate" DROP NOT NULL;

-- Clear synthetic defaults that were stamped at insert time (within 2s of createdAt)
UPDATE "FacilitatorAssignment"
SET "startDate" = NULL
WHERE "startDate" IS NOT NULL
  AND ABS(EXTRACT(EPOCH FROM ("startDate" - "createdAt"))) < 2;
