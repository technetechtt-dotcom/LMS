-- Assessment integrity + invitation mail + P1 ops tables
DO $$ BEGIN
  ALTER TYPE "CompetencyResult" ADD VALUE IF NOT EXISTS 'PENDING';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Default cannot be set in this migration: Postgres requires the new enum value
-- to be committed before use (see 20260826120000_attendance_session_bind).

ALTER TABLE "AssessmentInstrument" ADD COLUMN IF NOT EXISTS "maxAttempts" INTEGER NOT NULL DEFAULT 3;

ALTER TABLE "AssessmentSubmission" ADD COLUMN IF NOT EXISTS "attemptNumber" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "AssessmentSubmission" ADD COLUMN IF NOT EXISTS "humanGrades" JSONB;

CREATE UNIQUE INDEX IF NOT EXISTS "AssessmentSubmission_assessmentId_enrollmentId_attemptNumber_key"
  ON "AssessmentSubmission"("assessmentId", "enrollmentId", "attemptNumber");

ALTER TABLE "Invitation" ADD COLUMN IF NOT EXISTS "mailStatus" TEXT NOT NULL DEFAULT 'PENDING';
ALTER TABLE "Invitation" ADD COLUMN IF NOT EXISTS "mailAttempts" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Invitation" ADD COLUMN IF NOT EXISTS "lastMailError" TEXT;
ALTER TABLE "Invitation" ADD COLUMN IF NOT EXISTS "lastMailedAt" TIMESTAMP(3);

CREATE TABLE IF NOT EXISTS "Incident" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organisationId" UUID NOT NULL,
  "severity" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "reportedById" UUID,
  "resolvedAt" TIMESTAMP(3),
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Incident_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "Incident_organisationId_status_idx" ON "Incident"("organisationId", "status");

CREATE TABLE IF NOT EXISTS "RetentionPolicy" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organisationId" UUID NOT NULL,
  "entityType" TEXT NOT NULL,
  "retainDays" INTEGER NOT NULL,
  "disposalMethod" TEXT NOT NULL DEFAULT 'SOFT_DELETE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RetentionPolicy_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "RetentionPolicy_organisationId_entityType_key"
  ON "RetentionPolicy"("organisationId", "entityType");

CREATE TABLE IF NOT EXISTS "DataExportJob" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organisationId" UUID NOT NULL,
  "subjectUserId" UUID NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'QUEUED',
  "storageKey" TEXT,
  "requestedById" UUID NOT NULL,
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DataExportJob_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "DataExportJob_organisationId_subjectUserId_idx"
  ON "DataExportJob"("organisationId", "subjectUserId");

CREATE TABLE IF NOT EXISTS "AttendanceSession" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organisationId" UUID NOT NULL,
  "programmeId" UUID NOT NULL,
  "openedById" UUID NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "closedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AttendanceSession_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "AttendanceSession_tokenHash_key" ON "AttendanceSession"("tokenHash");
CREATE INDEX IF NOT EXISTS "AttendanceSession_organisationId_programmeId_idx"
  ON "AttendanceSession"("organisationId", "programmeId");

INSERT INTO "Role" ("id", "code", "name", "createdAt", "updatedAt")
SELECT gen_random_uuid(), 'MENTOR', 'Workplace Mentor', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "Role" WHERE "code" = 'MENTOR');
