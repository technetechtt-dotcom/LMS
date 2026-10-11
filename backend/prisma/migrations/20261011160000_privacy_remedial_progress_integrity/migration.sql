-- Remedial staff override FK + index
DO $$ BEGIN
  ALTER TABLE "RemedialAssignment"
    ADD CONSTRAINT "RemedialAssignment_staffOverrideById_fkey"
    FOREIGN KEY ("staffOverrideById") REFERENCES "User"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE INDEX IF NOT EXISTS "RemedialAssignment_staffOverrideById_idx"
  ON "RemedialAssignment"("staffOverrideById");

-- Prevent duplicate module-level progress rows when materialId is null
CREATE UNIQUE INDEX IF NOT EXISTS "LearningProgress_enrollment_kind_module_null_material_uidx"
  ON "LearningProgress" ("enrollmentId", "kind", "moduleKey")
  WHERE "materialId" IS NULL AND "moduleKey" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "LearningProgress_enrollmentId_kind_moduleKey_idx"
  ON "LearningProgress"("enrollmentId", "kind", "moduleKey");

-- Privacy DSAR operational fields
ALTER TABLE "DataSubjectRequest" ADD COLUMN IF NOT EXISTS "dueAt" TIMESTAMP(3);
ALTER TABLE "DataSubjectRequest" ADD COLUMN IF NOT EXISTS "assignedToId" UUID;
ALTER TABLE "DataSubjectRequest" ADD COLUMN IF NOT EXISTS "evidenceDocumentIds" JSONB;
ALTER TABLE "DataSubjectRequest" ADD COLUMN IF NOT EXISTS "statusHistory" JSONB;
CREATE INDEX IF NOT EXISTS "DataSubjectRequest_dueAt_idx" ON "DataSubjectRequest"("dueAt");

-- Incident severity enum + operational fields
DO $$ BEGIN
  CREATE TYPE "IncidentSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "Incident" ADD COLUMN IF NOT EXISTS "assignedToId" UUID;
ALTER TABLE "Incident" ADD COLUMN IF NOT EXISTS "resolutionNotes" TEXT;
ALTER TABLE "Incident" ADD COLUMN IF NOT EXISTS "evidenceDocumentIds" JSONB;
ALTER TABLE "Incident" ADD COLUMN IF NOT EXISTS "timeline" JSONB;

-- Normalize free-text severity then convert column type
UPDATE "Incident"
SET "severity" = UPPER(TRIM("severity"))
WHERE "severity" IS NOT NULL;

UPDATE "Incident"
SET "severity" = 'MEDIUM'
WHERE UPPER(TRIM("severity")) NOT IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

ALTER TABLE "Incident"
  ALTER COLUMN "severity" DROP DEFAULT;

ALTER TABLE "Incident"
  ALTER COLUMN "severity" TYPE "IncidentSeverity"
  USING ("severity"::"IncidentSeverity");

ALTER TABLE "Incident"
  ALTER COLUMN "severity" SET DEFAULT 'MEDIUM'::"IncidentSeverity";

CREATE INDEX IF NOT EXISTS "Incident_assignedToId_idx" ON "Incident"("assignedToId");
