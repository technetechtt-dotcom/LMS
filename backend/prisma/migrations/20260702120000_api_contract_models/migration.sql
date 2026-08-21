-- CreateTable
CREATE TABLE "AssessmentSubmission" (
    "id" UUID NOT NULL,
    "enrollmentId" UUID NOT NULL,
    "assessmentId" UUID NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'submitted',
    "responses" JSONB NOT NULL DEFAULT '[]',
    "score" DOUBLE PRECISION,
    "percentage" DOUBLE PRECISION,
    "feedback" TEXT,
    "submittedAt" TIMESTAMP(3),
    "gradedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssessmentSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" UUID NOT NULL,
    "fromId" UUID NOT NULL,
    "toId" UUID NOT NULL,
    "content" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AssessmentSubmission_enrollmentId_assessmentId_idx" ON "AssessmentSubmission"("enrollmentId", "assessmentId");

-- CreateIndex
CREATE INDEX "AssessmentSubmission_assessmentId_status_idx" ON "AssessmentSubmission"("assessmentId", "status");

-- CreateIndex
CREATE INDEX "Message_fromId_createdAt_idx" ON "Message"("fromId", "createdAt");

-- CreateIndex
CREATE INDEX "Message_toId_isRead_createdAt_idx" ON "Message"("toId", "isRead", "createdAt");

-- AddForeignKey
ALTER TABLE "AssessmentSubmission" ADD CONSTRAINT "AssessmentSubmission_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "Enrollment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentSubmission" ADD CONSTRAINT "AssessmentSubmission_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "Assessment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_fromId_fkey" FOREIGN KEY ("fromId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_toId_fkey" FOREIGN KEY ("toId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
