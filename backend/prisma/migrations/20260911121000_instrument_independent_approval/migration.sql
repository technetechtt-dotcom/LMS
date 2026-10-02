ALTER TYPE "AssessmentInstrumentStatus" ADD VALUE IF NOT EXISTS 'IN_REVIEW';
ALTER TYPE "AssessmentInstrumentStatus" ADD VALUE IF NOT EXISTS 'APPROVED';

ALTER TABLE "AssessmentInstrument"
  ADD COLUMN "createdById" UUID,
  ADD COLUMN "submittedById" UUID,
  ADD COLUMN "submittedAt" TIMESTAMP(3),
  ADD COLUMN "approvedById" UUID,
  ADD COLUMN "approvedAt" TIMESTAMP(3),
  ADD COLUMN "publishedById" UUID,
  ADD COLUMN "reviewNotes" TEXT;

CREATE INDEX "AssessmentInstrument_createdById_idx" ON "AssessmentInstrument"("createdById");
CREATE INDEX "AssessmentInstrument_approvedById_idx" ON "AssessmentInstrument"("approvedById");
ALTER TABLE "AssessmentInstrument" ADD CONSTRAINT "AssessmentInstrument_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AssessmentInstrument" ADD CONSTRAINT "AssessmentInstrument_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AssessmentInstrument" ADD CONSTRAINT "AssessmentInstrument_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AssessmentInstrument" ADD CONSTRAINT "AssessmentInstrument_publishedById_fkey" FOREIGN KEY ("publishedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
