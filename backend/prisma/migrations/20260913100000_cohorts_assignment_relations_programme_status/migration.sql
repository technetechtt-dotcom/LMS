-- CreateEnum safely
DO $$ BEGIN
    CREATE TYPE "ProgrammeStatus" AS ENUM ('draft', 'active', 'archived');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AlterTable Programme with safe enum casting
ALTER TABLE "Programme" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "Programme" ALTER COLUMN "status" DROP DEFAULT;

-- Safely sanitize legacy status values before converting to enum
UPDATE "Programme" SET "status" = CASE
    WHEN LOWER(TRIM("status"::text)) IN ('active', 'published', 'in_progress', 'live') THEN 'active'
    WHEN LOWER(TRIM("status"::text)) IN ('archived', 'inactive', 'closed', 'cancelled') THEN 'archived'
    ELSE 'draft'
END;

ALTER TABLE "Programme" ALTER COLUMN "status" TYPE "ProgrammeStatus" USING (
    CASE
        WHEN LOWER(TRIM("status"::text)) IN ('active', 'published', 'in_progress', 'live') THEN 'active'::"ProgrammeStatus"
        WHEN LOWER(TRIM("status"::text)) IN ('archived', 'inactive', 'closed', 'cancelled') THEN 'archived'::"ProgrammeStatus"
        ELSE 'draft'::"ProgrammeStatus"
    END
);
ALTER TABLE "Programme" ALTER COLUMN "status" SET DEFAULT 'draft'::"ProgrammeStatus";

-- CreateTable Cohort
CREATE TABLE IF NOT EXISTS "Cohort" (
    "id" UUID NOT NULL,
    "organisationId" UUID NOT NULL,
    "programmeId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Cohort_pkey" PRIMARY KEY ("id")
);

-- AlterTable FacilitatorAssignment preserving existing cohortId data
DO $$ BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'FacilitatorAssignment' AND column_name = 'cohortId' AND data_type != 'uuid'
    ) THEN
        -- Backfill missing Cohort rows for valid existing cohortId values before casting:
        INSERT INTO "Cohort" ("id", "organisationId", "programmeId", "name", "updatedAt")
        SELECT DISTINCT
            ("cohortId"::uuid),
            fa."organisationId",
            fa."programmeId",
            'Cohort ' || SUBSTRING("cohortId"::text FROM 1 FOR 8),
            NOW()
        FROM "FacilitatorAssignment" fa
        WHERE fa."cohortId" IS NOT NULL
          AND fa."cohortId"::text ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
          AND NOT EXISTS (SELECT 1 FROM "Cohort" c WHERE c.id = fa."cohortId"::uuid)
        ON CONFLICT ("id") DO NOTHING;

        -- Alter column to UUID using safe regex check
        ALTER TABLE "FacilitatorAssignment" ALTER COLUMN "cohortId" TYPE UUID USING (
            CASE 
                WHEN "cohortId"::text ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' 
                THEN "cohortId"::uuid 
                ELSE NULL 
            END
        );
    ELSE
        ALTER TABLE "FacilitatorAssignment" ADD COLUMN IF NOT EXISTS "cohortId" UUID;
    END IF;
END $$;

-- AlterTable Enrollment
ALTER TABLE "Enrollment" ADD COLUMN IF NOT EXISTS "cohortId" UUID;

-- Backfill missing Cohort rows if Enrollment already had cohortId values
DO $$ BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Enrollment' AND column_name = 'cohortId'
    ) THEN
        INSERT INTO "Cohort" ("id", "organisationId", "programmeId", "name", "updatedAt")
        SELECT DISTINCT
            e."cohortId",
            e."sdioOrganisationId",
            e."programmeId",
            'Cohort ' || SUBSTRING(e."cohortId"::text FROM 1 FOR 8),
            NOW()
        FROM "Enrollment" e
        WHERE e."cohortId" IS NOT NULL
          AND NOT EXISTS (SELECT 1 FROM "Cohort" c WHERE c.id = e."cohortId")
        ON CONFLICT ("id") DO NOTHING;
    END IF;
END $$;

-- Clean orphan foreign keys before adding constraints
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

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Cohort_organisationId_programmeId_idx" ON "Cohort"("organisationId", "programmeId");
CREATE INDEX IF NOT EXISTS "FacilitatorAssignment_moduleId_idx" ON "FacilitatorAssignment"("moduleId");
CREATE INDEX IF NOT EXISTS "FacilitatorAssignment_learnerId_idx" ON "FacilitatorAssignment"("learnerId");
CREATE INDEX IF NOT EXISTS "FacilitatorAssignment_cohortId_idx" ON "FacilitatorAssignment"("cohortId");

-- AddForeignKey with idempotency
DO $$ BEGIN
    ALTER TABLE "Cohort" ADD CONSTRAINT "Cohort_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "Cohort" ADD CONSTRAINT "Cohort_programmeId_fkey" FOREIGN KEY ("programmeId") REFERENCES "Programme"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "FacilitatorAssignment" ADD CONSTRAINT "FacilitatorAssignment_cohortId_fkey" FOREIGN KEY ("cohortId") REFERENCES "Cohort"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "FacilitatorAssignment" ADD CONSTRAINT "FacilitatorAssignment_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "ProgrammeModule"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "FacilitatorAssignment" ADD CONSTRAINT "FacilitatorAssignment_learnerId_fkey" FOREIGN KEY ("learnerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_cohortId_fkey" FOREIGN KEY ("cohortId") REFERENCES "Cohort"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
