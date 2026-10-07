-- Additive safety reconciliation. Does not rewrite historical migrations.
-- Safe for databases that already applied 20260913100000 (original or later checksum).

-- Cohort archive column used by create/list/edit/archive APIs
ALTER TABLE "Cohort" ADD COLUMN IF NOT EXISTS "archivedAt" TIMESTAMP(3);

-- Idempotent indexes (original migration used non-IF-NOT-EXISTS names)
CREATE INDEX IF NOT EXISTS "Cohort_organisationId_programmeId_idx" ON "Cohort"("organisationId", "programmeId");
CREATE INDEX IF NOT EXISTS "FacilitatorAssignment_moduleId_idx" ON "FacilitatorAssignment"("moduleId");
CREATE INDEX IF NOT EXISTS "FacilitatorAssignment_learnerId_idx" ON "FacilitatorAssignment"("learnerId");
CREATE INDEX IF NOT EXISTS "FacilitatorAssignment_cohortId_idx" ON "FacilitatorAssignment"("cohortId");

-- Nullify orphan foreign keys so existing rows are not rejected by later constraint checks
UPDATE "FacilitatorAssignment"
SET "moduleId" = NULL
WHERE "moduleId" IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM "ProgrammeModule" pm WHERE pm.id = "FacilitatorAssignment"."moduleId");

UPDATE "FacilitatorAssignment"
SET "learnerId" = NULL
WHERE "learnerId" IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM "User" u WHERE u.id = "FacilitatorAssignment"."learnerId");

UPDATE "FacilitatorAssignment"
SET "cohortId" = NULL
WHERE "cohortId" IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM "Cohort" c WHERE c.id = "FacilitatorAssignment"."cohortId");

UPDATE "Enrollment"
SET "cohortId" = NULL
WHERE "cohortId" IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM "Cohort" c WHERE c.id = "Enrollment"."cohortId");
