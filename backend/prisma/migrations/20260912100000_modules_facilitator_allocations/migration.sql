-- CreateEnum
CREATE TYPE "ModuleType" AS ENUM ('KNOWLEDGE', 'PRACTICAL', 'WORKPLACE');

-- AlterTable
ALTER TABLE "Programme" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'draft';

-- AlterTable
ALTER TABLE "Qualification" ADD COLUMN "seta" TEXT;

-- CreateTable
CREATE TABLE "ProgrammeModule" (
    "id" UUID NOT NULL,
    "programmeId" UUID NOT NULL,
    "unitStandardId" UUID,
    "title" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" "ModuleType" NOT NULL DEFAULT 'KNOWLEDGE',
    "credits" INTEGER NOT NULL DEFAULT 0,
    "order" INTEGER NOT NULL DEFAULT 1,
    "description" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ProgrammeModule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FacilitatorAssignment" (
    "id" UUID NOT NULL,
    "organisationId" UUID NOT NULL,
    "facilitatorId" UUID NOT NULL,
    "programmeId" UUID NOT NULL,
    "cohortId" TEXT,
    "moduleId" UUID,
    "learnerId" UUID,
    "role" "FacilitatorRole" DEFAULT 'LEAD_FACILITATOR',
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "FacilitatorAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProgrammeModule_programmeId_code_key" ON "ProgrammeModule"("programmeId", "code");
CREATE INDEX "ProgrammeModule_programmeId_order_idx" ON "ProgrammeModule"("programmeId", "order");

-- CreateIndex
CREATE INDEX "FacilitatorAssignment_organisationId_facilitatorId_idx" ON "FacilitatorAssignment"("organisationId", "facilitatorId");
CREATE INDEX "FacilitatorAssignment_programmeId_facilitatorId_idx" ON "FacilitatorAssignment"("programmeId", "facilitatorId");
CREATE INDEX "FacilitatorAssignment_facilitatorId_isActive_idx" ON "FacilitatorAssignment"("facilitatorId", "isActive");

-- AddForeignKey
ALTER TABLE "ProgrammeModule" ADD CONSTRAINT "ProgrammeModule_programmeId_fkey" FOREIGN KEY ("programmeId") REFERENCES "Programme"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProgrammeModule" ADD CONSTRAINT "ProgrammeModule_unitStandardId_fkey" FOREIGN KEY ("unitStandardId") REFERENCES "UnitStandard"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FacilitatorAssignment" ADD CONSTRAINT "FacilitatorAssignment_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FacilitatorAssignment" ADD CONSTRAINT "FacilitatorAssignment_facilitatorId_fkey" FOREIGN KEY ("facilitatorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FacilitatorAssignment" ADD CONSTRAINT "FacilitatorAssignment_programmeId_fkey" FOREIGN KEY ("programmeId") REFERENCES "Programme"("id") ON DELETE CASCADE ON UPDATE CASCADE;
