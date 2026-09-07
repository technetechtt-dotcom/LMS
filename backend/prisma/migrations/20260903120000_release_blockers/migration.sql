-- AlterTable User profile fields
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "phone" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "jobTitle" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "signatureStorageKey" TEXT;

-- AlterTable Assessment assigned moderator
ALTER TABLE "Assessment" ADD COLUMN IF NOT EXISTS "moderatorId" UUID;
CREATE INDEX IF NOT EXISTS "Assessment_moderatorId_idx" ON "Assessment"("moderatorId");

-- AlterTable AssessmentInstrument tenant ownership
ALTER TABLE "AssessmentInstrument" ADD COLUMN IF NOT EXISTS "organisationId" UUID;

-- Created as a UNIQUE INDEX (not a table constraint) in earlier migrations.
DROP INDEX IF EXISTS "AssessmentInstrument_unitStandardId_version_key";
ALTER TABLE "AssessmentInstrument" DROP CONSTRAINT IF EXISTS "AssessmentInstrument_unitStandardId_version_key";

-- Instruments were global before this migration. Preserve that availability by
-- giving every existing organisation its own copy, including the question set.
-- Keep the original IDs for the first organisation so historical submissions
-- remain bound to their original questions and frozen responses.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "AssessmentInstrument")
     AND NOT EXISTS (SELECT 1 FROM "Organisation") THEN
    RAISE EXCEPTION 'Cannot tenant-scope assessment instruments without an organisation';
  END IF;
END $$;

CREATE TEMP TABLE "_AssessmentInstrumentTenantMap" AS
WITH organisations AS (
  SELECT
    "id",
    row_number() OVER (ORDER BY "createdAt", "id") AS "position"
  FROM "Organisation"
), instruments AS (
  SELECT "id"
  FROM "AssessmentInstrument"
  WHERE "organisationId" IS NULL
)
SELECT
  instruments."id" AS "sourceInstrumentId",
  organisations."id" AS "organisationId",
  CASE
    WHEN organisations."position" = 1 THEN instruments."id"
    ELSE gen_random_uuid()
  END AS "tenantInstrumentId"
FROM instruments
CROSS JOIN organisations;

UPDATE "AssessmentInstrument" AS instrument
SET "organisationId" = mapping."organisationId"
FROM "_AssessmentInstrumentTenantMap" AS mapping
WHERE mapping."sourceInstrumentId" = instrument."id"
  AND mapping."tenantInstrumentId" = instrument."id";

INSERT INTO "AssessmentInstrument" (
  "id",
  "organisationId",
  "unitStandardId",
  "version",
  "title",
  "status",
  "publishedAt",
  "maxAttempts",
  "passMark",
  "timeLimitMinutes",
  "createdAt",
  "updatedAt"
)
SELECT
  mapping."tenantInstrumentId",
  mapping."organisationId",
  source."unitStandardId",
  source."version",
  source."title",
  source."status",
  source."publishedAt",
  source."maxAttempts",
  source."passMark",
  source."timeLimitMinutes",
  source."createdAt",
  source."updatedAt"
FROM "_AssessmentInstrumentTenantMap" AS mapping
JOIN "AssessmentInstrument" AS source
  ON source."id" = mapping."sourceInstrumentId"
WHERE mapping."tenantInstrumentId" <> mapping."sourceInstrumentId";

INSERT INTO "AssessmentQuestion" (
  "id",
  "unitStandardId",
  "instrumentId",
  "orderIndex",
  "prompt",
  "questionType",
  "options",
  "points",
  "createdAt",
  "updatedAt",
  "deletedAt"
)
SELECT
  gen_random_uuid(),
  question."unitStandardId",
  mapping."tenantInstrumentId",
  question."orderIndex",
  question."prompt",
  question."questionType",
  question."options",
  question."points",
  question."createdAt",
  question."updatedAt",
  question."deletedAt"
FROM "_AssessmentInstrumentTenantMap" AS mapping
JOIN "AssessmentQuestion" AS question
  ON question."instrumentId" = mapping."sourceInstrumentId"
WHERE mapping."tenantInstrumentId" <> mapping."sourceInstrumentId";

ALTER TABLE "AssessmentInstrument" ALTER COLUMN "organisationId" SET NOT NULL;

ALTER TABLE "AssessmentInstrument"
  ADD CONSTRAINT "AssessmentInstrument_organisationId_unitStandardId_version_key"
  UNIQUE ("organisationId", "unitStandardId", "version");

CREATE INDEX IF NOT EXISTS "AssessmentInstrument_organisationId_status_idx"
  ON "AssessmentInstrument"("organisationId", "status");

ALTER TABLE "AssessmentInstrument"
  ADD CONSTRAINT "AssessmentInstrument_organisationId_fkey"
  FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

DROP TABLE "_AssessmentInstrumentTenantMap";

-- AlterTable AttendanceSession scheduled denominator
ALTER TABLE "AttendanceSession" ADD COLUMN IF NOT EXISTS "title" TEXT;
ALTER TABLE "AttendanceSession" ADD COLUMN IF NOT EXISTS "scheduledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "AttendanceSession" ADD COLUMN IF NOT EXISTS "expectedCount" INTEGER NOT NULL DEFAULT 0;

-- CreateTable SetaGatewaySubmission
CREATE TABLE IF NOT EXISTS "SetaGatewaySubmission" (
    "id" UUID NOT NULL,
    "organisationId" UUID NOT NULL,
    "batchId" TEXT NOT NULL,
    "adapter" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "gatewayUrl" TEXT,
    "externalReference" TEXT,
    "responseBody" TEXT,
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SetaGatewaySubmission_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "SetaGatewaySubmission_organisationId_batchId_idx"
  ON "SetaGatewaySubmission"("organisationId", "batchId");

ALTER TABLE "SetaGatewaySubmission"
  ADD CONSTRAINT "SetaGatewaySubmission_organisationId_fkey"
  FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
