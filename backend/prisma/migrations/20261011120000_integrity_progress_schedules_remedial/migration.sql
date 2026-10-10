-- AlterTable Enrollment: typed workplace mentor allocation
ALTER TABLE "Enrollment" ADD COLUMN IF NOT EXISTS "workplaceMentorId" UUID;

CREATE INDEX IF NOT EXISTS "Enrollment_workplaceMentorId_idx"
  ON "Enrollment"("workplaceMentorId");

ALTER TABLE "Enrollment"
  DROP CONSTRAINT IF EXISTS "Enrollment_workplaceMentorId_fkey";

ALTER TABLE "Enrollment"
  ADD CONSTRAINT "Enrollment_workplaceMentorId_fkey"
  FOREIGN KEY ("workplaceMentorId") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill mentor FK from historical enrollment JSON metadata
UPDATE "Enrollment"
SET "workplaceMentorId" = NULLIF(metadata->>'workplaceMentorId', '')::uuid
WHERE "workplaceMentorId" IS NULL
  AND metadata ? 'workplaceMentorId'
  AND metadata->>'workplaceMentorId' ~* '^[0-9a-f-]{36}$'
  AND EXISTS (
    SELECT 1 FROM "User" u
    WHERE u.id = NULLIF(metadata->>'workplaceMentorId', '')::uuid
  );

-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "LearningProgressKind" AS ENUM ('MATERIAL_READ', 'MATERIAL_COMPLETED', 'BOOKMARK');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "ComplianceScheduleKind" AS ENUM ('SUBMISSION', 'AUDIT');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "ComplianceScheduleStatus" AS ENUM ('SCHEDULED', 'REMINDED', 'COMPLETED', 'CANCELLED', 'OVERDUE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "LearningProgress" (
  "id" UUID NOT NULL,
  "enrollmentId" UUID NOT NULL,
  "materialId" UUID,
  "moduleKey" TEXT,
  "kind" "LearningProgressKind" NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LearningProgress_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "LearningProgress_enrollmentId_materialId_kind_key"
  ON "LearningProgress"("enrollmentId", "materialId", "kind");

CREATE INDEX IF NOT EXISTS "LearningProgress_enrollmentId_moduleKey_idx"
  ON "LearningProgress"("enrollmentId", "moduleKey");

ALTER TABLE "LearningProgress"
  DROP CONSTRAINT IF EXISTS "LearningProgress_enrollmentId_fkey";
ALTER TABLE "LearningProgress"
  ADD CONSTRAINT "LearningProgress_enrollmentId_fkey"
  FOREIGN KEY ("enrollmentId") REFERENCES "Enrollment"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "LearningProgress"
  DROP CONSTRAINT IF EXISTS "LearningProgress_materialId_fkey";
ALTER TABLE "LearningProgress"
  ADD CONSTRAINT "LearningProgress_materialId_fkey"
  FOREIGN KEY ("materialId") REFERENCES "LearningMaterial"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "ComplianceSchedule" (
  "id" UUID NOT NULL,
  "organisationId" UUID NOT NULL,
  "kind" "ComplianceScheduleKind" NOT NULL,
  "type" TEXT NOT NULL,
  "reference" TEXT,
  "scheduledFor" TIMESTAMP(3) NOT NULL,
  "status" "ComplianceScheduleStatus" NOT NULL DEFAULT 'SCHEDULED',
  "notes" TEXT,
  "conductor" TEXT,
  "reminderSentAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "cancelledAt" TIMESTAMP(3),
  "createdById" UUID NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ComplianceSchedule_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ComplianceSchedule_organisationId_status_scheduledFor_idx"
  ON "ComplianceSchedule"("organisationId", "status", "scheduledFor");

ALTER TABLE "ComplianceSchedule"
  DROP CONSTRAINT IF EXISTS "ComplianceSchedule_organisationId_fkey";
ALTER TABLE "ComplianceSchedule"
  ADD CONSTRAINT "ComplianceSchedule_organisationId_fkey"
  FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ComplianceSchedule"
  DROP CONSTRAINT IF EXISTS "ComplianceSchedule_createdById_fkey";
ALTER TABLE "ComplianceSchedule"
  ADD CONSTRAINT "ComplianceSchedule_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "RemedialAssignment" (
  "id" UUID NOT NULL,
  "enrollmentId" UUID NOT NULL,
  "materialId" UUID,
  "title" TEXT NOT NULL,
  "instructions" TEXT,
  "dueAt" TIMESTAMP(3),
  "assignedById" UUID NOT NULL,
  "acknowledgedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RemedialAssignment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "RemedialAssignment_enrollmentId_dueAt_idx"
  ON "RemedialAssignment"("enrollmentId", "dueAt");

ALTER TABLE "RemedialAssignment"
  DROP CONSTRAINT IF EXISTS "RemedialAssignment_enrollmentId_fkey";
ALTER TABLE "RemedialAssignment"
  ADD CONSTRAINT "RemedialAssignment_enrollmentId_fkey"
  FOREIGN KEY ("enrollmentId") REFERENCES "Enrollment"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RemedialAssignment"
  DROP CONSTRAINT IF EXISTS "RemedialAssignment_materialId_fkey";
ALTER TABLE "RemedialAssignment"
  ADD CONSTRAINT "RemedialAssignment_materialId_fkey"
  FOREIGN KEY ("materialId") REFERENCES "LearningMaterial"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "RemedialAssignment"
  DROP CONSTRAINT IF EXISTS "RemedialAssignment_assignedById_fkey";
ALTER TABLE "RemedialAssignment"
  ADD CONSTRAINT "RemedialAssignment_assignedById_fkey"
  FOREIGN KEY ("assignedById") REFERENCES "User"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
