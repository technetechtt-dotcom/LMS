-- CreateEnum
CREATE TYPE "ProgrammeStatus" AS ENUM ('draft', 'active', 'archived');

-- AlterTable Programme
ALTER TABLE "Programme" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "Programme" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Programme" ALTER COLUMN "status" TYPE "ProgrammeStatus" USING ("status"::text::"ProgrammeStatus");
ALTER TABLE "Programme" ALTER COLUMN "status" SET DEFAULT 'draft';

-- AlterTable FacilitatorAssignment
ALTER TABLE "FacilitatorAssignment" DROP COLUMN IF EXISTS "cohortId";
ALTER TABLE "FacilitatorAssignment" ADD COLUMN "cohortId" UUID;

-- CreateTable Cohort
CREATE TABLE "Cohort" (
    "id" UUID NOT NULL,
    "organisationId" UUID NOT NULL,
    "programmeId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Cohort_pkey" PRIMARY KEY ("id")
);

-- AlterTable Enrollment
ALTER TABLE "Enrollment" ADD COLUMN IF NOT EXISTS "cohortId" UUID;

-- CreateIndex
CREATE INDEX "Cohort_organisationId_programmeId_idx" ON "Cohort"("organisationId", "programmeId");

-- CreateIndex
CREATE INDEX "FacilitatorAssignment_moduleId_idx" ON "FacilitatorAssignment"("moduleId");
CREATE INDEX "FacilitatorAssignment_learnerId_idx" ON "FacilitatorAssignment"("learnerId");
CREATE INDEX "FacilitatorAssignment_cohortId_idx" ON "FacilitatorAssignment"("cohortId");

-- AddForeignKey
ALTER TABLE "Cohort" ADD CONSTRAINT "Cohort_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Cohort" ADD CONSTRAINT "Cohort_programmeId_fkey" FOREIGN KEY ("programmeId") REFERENCES "Programme"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FacilitatorAssignment" ADD CONSTRAINT "FacilitatorAssignment_cohortId_fkey" FOREIGN KEY ("cohortId") REFERENCES "Cohort"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FacilitatorAssignment" ADD CONSTRAINT "FacilitatorAssignment_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "ProgrammeModule"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FacilitatorAssignment" ADD CONSTRAINT "FacilitatorAssignment_learnerId_fkey" FOREIGN KEY ("learnerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_cohortId_fkey" FOREIGN KEY ("cohortId") REFERENCES "Cohort"("id") ON DELETE SET NULL ON UPDATE CASCADE;
