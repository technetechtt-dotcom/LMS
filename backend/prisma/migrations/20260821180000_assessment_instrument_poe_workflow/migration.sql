-- Assessment instrument versioning + submission freeze
CREATE TYPE "AssessmentInstrumentStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'RETIRED');

CREATE TABLE "AssessmentInstrument" (
    "id" UUID NOT NULL,
    "unitStandardId" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "title" TEXT,
    "status" "AssessmentInstrumentStatus" NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AssessmentInstrument_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AssessmentInstrument_unitStandardId_version_key" ON "AssessmentInstrument"("unitStandardId", "version");
CREATE INDEX "AssessmentInstrument_unitStandardId_status_idx" ON "AssessmentInstrument"("unitStandardId", "status");

ALTER TABLE "AssessmentInstrument" ADD CONSTRAINT "AssessmentInstrument_unitStandardId_fkey" FOREIGN KEY ("unitStandardId") REFERENCES "UnitStandard"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "AssessmentQuestion" ADD COLUMN "instrumentId" UUID;
CREATE INDEX "AssessmentQuestion_instrumentId_orderIndex_idx" ON "AssessmentQuestion"("instrumentId", "orderIndex");
ALTER TABLE "AssessmentQuestion" ADD CONSTRAINT "AssessmentQuestion_instrumentId_fkey" FOREIGN KEY ("instrumentId") REFERENCES "AssessmentInstrument"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AssessmentSubmission" ADD COLUMN "instrumentId" UUID;
CREATE INDEX "AssessmentSubmission_instrumentId_idx" ON "AssessmentSubmission"("instrumentId");
ALTER TABLE "AssessmentSubmission" ADD CONSTRAINT "AssessmentSubmission_instrumentId_fkey" FOREIGN KEY ("instrumentId") REFERENCES "AssessmentInstrument"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill: one PUBLISHED v1 instrument per unit standard that has questions
INSERT INTO "AssessmentInstrument" ("id", "unitStandardId", "version", "title", "status", "publishedAt", "createdAt", "updatedAt")
SELECT gen_random_uuid(), q."unitStandardId", 1, 'Instrument v1', 'PUBLISHED'::"AssessmentInstrumentStatus", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM (SELECT DISTINCT "unitStandardId" FROM "AssessmentQuestion" WHERE "deletedAt" IS NULL) q;

UPDATE "AssessmentQuestion" aq
SET "instrumentId" = ai."id"
FROM "AssessmentInstrument" ai
WHERE aq."unitStandardId" = ai."unitStandardId"
  AND ai."version" = 1
  AND aq."instrumentId" IS NULL;
