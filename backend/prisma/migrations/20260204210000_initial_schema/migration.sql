-- CreateEnum
CREATE TYPE "OrganisationType" AS ENUM ('SDIO', 'EMPLOYER', 'SETA');

-- CreateEnum
CREATE TYPE "LearnerLifecycleStatus" AS ENUM ('ENROLLED', 'TRAINING', 'WORKPLACE', 'ASSESSMENT', 'MODERATION', 'COMPLETED');

-- CreateEnum
CREATE TYPE "CompetencyResult" AS ENUM ('C', 'NYC');

-- CreateEnum
CREATE TYPE "ModerationDecision" AS ENUM ('APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'ABSENT', 'EXCUSED', 'LATE');

-- CreateEnum
CREATE TYPE "WorkflowAction" AS ENUM ('START_TRAINING', 'MOVE_TO_WORKPLACE', 'START_ASSESSMENT', 'SUBMIT_FOR_MODERATION', 'COMPLETE_ENROLLMENT', 'REOPEN');

-- CreateEnum
CREATE TYPE "PoeLearningArtifactKind" AS ENUM ('LEARNER_GUIDE', 'WORKBOOK', 'SUMMATIVE');

-- CreateEnum
CREATE TYPE "PoeLearningArtifactStatus" AS ENUM ('DRAFT', 'ISSUED_TO_LEARNER', 'LEARNER_SUBMITTED', 'FACILITATOR_MARKED', 'ALLOCATED_TO_ASSESSOR', 'ASSESSOR_SATISFACTORY', 'SUBMITTED_TO_MODERATOR', 'MODERATION_COMPLETE');

-- CreateEnum
CREATE TYPE "PoeModerationOutcome" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ProgrammeKind" AS ENUM ('SKILLS_PROGRAMME', 'OCCUPATIONAL_PROGRAMME');

-- CreateEnum
CREATE TYPE "FacilitatorRole" AS ENUM ('LEAD_FACILITATOR', 'ASSISTANT_FACILITATOR', 'SUBJECT_SPECIALIST', 'WORKPLACE_COORDINATOR');

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "facilitatorRole" "FacilitatorRole",
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Role" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Organisation" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "registrationNo" TEXT,
    "type" "OrganisationType" NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Organisation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserOrganisation" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "roleId" UUID NOT NULL,
    "organisationId" UUID NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "UserOrganisation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Qualification" (
    "id" UUID NOT NULL,
    "saqaId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "nqfLevel" INTEGER NOT NULL,
    "totalCredits" INTEGER NOT NULL,
    "field" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Qualification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UnitStandard" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "credits" INTEGER NOT NULL,
    "level" INTEGER NOT NULL,
    "qualificationId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "UnitStandard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Outcome" (
    "id" UUID NOT NULL,
    "unitStandardId" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Outcome_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Programme" (
    "id" UUID NOT NULL,
    "organisationId" UUID NOT NULL,
    "qualificationId" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "programmeKind" "ProgrammeKind" NOT NULL DEFAULT 'OCCUPATIONAL_PROGRAMME',
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Programme_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Enrollment" (
    "id" UUID NOT NULL,
    "learnerId" UUID NOT NULL,
    "programmeId" UUID NOT NULL,
    "sdioOrganisationId" UUID NOT NULL,
    "employerOrganisationId" UUID,
    "status" "LearnerLifecycleStatus" NOT NULL DEFAULT 'ENROLLED',
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Enrollment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PoeLearningArtifact" (
    "id" UUID NOT NULL,
    "enrollmentId" UUID NOT NULL,
    "kind" "PoeLearningArtifactKind" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "PoeLearningArtifactStatus" NOT NULL DEFAULT 'DRAFT',
    "createdById" UUID NOT NULL,
    "facilitatorMarkedAt" TIMESTAMP(3),
    "facilitatorMarkedById" UUID,
    "facilitatorFeedback" TEXT,
    "allocatedToAssessorAt" TIMESTAMP(3),
    "assessorId" UUID,
    "assessorMarkedAt" TIMESTAMP(3),
    "assessorFeedback" TEXT,
    "submittedToModeratorAt" TIMESTAMP(3),
    "submittedForModerationById" UUID,
    "moderatorId" UUID,
    "moderatedAt" TIMESTAMP(3),
    "moderatorFeedback" TEXT,
    "moderationOutcome" "PoeModerationOutcome" NOT NULL DEFAULT 'PENDING',
    "storageKey" TEXT,
    "url" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "PoeLearningArtifact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Evidence" (
    "id" UUID NOT NULL,
    "enrollmentId" UUID NOT NULL,
    "unitStandardId" UUID NOT NULL,
    "outcomeId" UUID,
    "fileName" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "storageKey" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "metadata" JSONB,
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),
    "uploadedById" UUID NOT NULL,
    "verifiedById" UUID,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Evidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkplaceLog" (
    "id" UUID NOT NULL,
    "enrollmentId" UUID NOT NULL,
    "logDate" TIMESTAMP(3) NOT NULL,
    "hoursWorked" DECIMAL(5,2) NOT NULL,
    "activity" TEXT NOT NULL,
    "supervisorName" TEXT NOT NULL,
    "supervisorEmail" TEXT,
    "supervisorSignedAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "WorkplaceLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Assessment" (
    "id" UUID NOT NULL,
    "enrollmentId" UUID NOT NULL,
    "unitStandardId" UUID NOT NULL,
    "assessorId" UUID NOT NULL,
    "result" "CompetencyResult" NOT NULL,
    "feedback" TEXT,
    "evidenceLinks" JSONB,
    "assessedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Assessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Moderation" (
    "id" UUID NOT NULL,
    "assessmentId" UUID NOT NULL,
    "moderatorId" UUID NOT NULL,
    "decision" "ModerationDecision" NOT NULL,
    "feedback" TEXT,
    "moderatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "trail" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Moderation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attendance" (
    "id" UUID NOT NULL,
    "enrollmentId" UUID NOT NULL,
    "sessionDate" TIMESTAMP(3) NOT NULL,
    "status" "AttendanceStatus" NOT NULL,
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Attendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" UUID NOT NULL,
    "organisationId" UUID,
    "enrollmentId" UUID,
    "category" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "metadata" JSONB,
    "verifiedById" UUID,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LearningMaterial" (
    "id" UUID NOT NULL,
    "organisationId" UUID NOT NULL,
    "programmeId" UUID,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "moduleCode" TEXT,
    "artifactSlug" TEXT NOT NULL DEFAULT 'other',
    "artifactTypeLabel" TEXT,
    "poeComponent" TEXT NOT NULL DEFAULT 'Knowledge',
    "moduleKey" TEXT,
    "moduleLabel" TEXT,
    "mediaKind" TEXT NOT NULL DEFAULT 'pdf',
    "formatLabel" TEXT NOT NULL DEFAULT 'PDF',
    "fileName" TEXT,
    "fileSizeBytes" INTEGER NOT NULL DEFAULT 0,
    "storageKey" TEXT,
    "url" TEXT NOT NULL,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "downloadCount" INTEGER NOT NULL DEFAULT 0,
    "completionCount" INTEGER NOT NULL DEFAULT 0,
    "isApproved" BOOLEAN NOT NULL DEFAULT true,
    "isAIEnhanced" BOOLEAN NOT NULL DEFAULT false,
    "uploadedById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "LearningMaterial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowState" (
    "id" UUID NOT NULL,
    "code" "LearnerLifecycleStatus" NOT NULL,
    "label" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkflowState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnrollmentWorkflow" (
    "id" UUID NOT NULL,
    "enrollmentId" UUID NOT NULL,
    "fromState" "LearnerLifecycleStatus" NOT NULL,
    "toState" "LearnerLifecycleStatus" NOT NULL,
    "action" "WorkflowAction" NOT NULL,
    "reason" TEXT,
    "changedById" UUID NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EnrollmentWorkflow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssessmentQuestion" (
    "id" UUID NOT NULL,
    "unitStandardId" UUID NOT NULL,
    "orderIndex" INTEGER NOT NULL,
    "prompt" TEXT NOT NULL,
    "questionType" TEXT NOT NULL DEFAULT 'mcq_single',
    "options" JSONB,
    "points" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "AssessmentQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InAppNotification" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "readAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InAppNotification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" UUID NOT NULL,
    "organisationId" UUID,
    "actorId" UUID,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "action" TEXT NOT NULL,
    "beforeValue" JSONB,
    "afterValue" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Role_code_key" ON "Role"("code");

-- CreateIndex
CREATE INDEX "UserOrganisation_organisationId_roleId_idx" ON "UserOrganisation"("organisationId", "roleId");

-- CreateIndex
CREATE UNIQUE INDEX "UserOrganisation_userId_roleId_organisationId_key" ON "UserOrganisation"("userId", "roleId", "organisationId");

-- CreateIndex
CREATE UNIQUE INDEX "Qualification_saqaId_key" ON "Qualification"("saqaId");

-- CreateIndex
CREATE UNIQUE INDEX "UnitStandard_code_key" ON "UnitStandard"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Outcome_unitStandardId_code_key" ON "Outcome"("unitStandardId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "Programme_organisationId_code_key" ON "Programme"("organisationId", "code");

-- CreateIndex
CREATE INDEX "Enrollment_programmeId_status_idx" ON "Enrollment"("programmeId", "status");

-- CreateIndex
CREATE INDEX "Enrollment_learnerId_status_idx" ON "Enrollment"("learnerId", "status");

-- CreateIndex
CREATE INDEX "PoeLearningArtifact_enrollmentId_status_idx" ON "PoeLearningArtifact"("enrollmentId", "status");

-- CreateIndex
CREATE INDEX "PoeLearningArtifact_assessorId_status_idx" ON "PoeLearningArtifact"("assessorId", "status");

-- CreateIndex
CREATE INDEX "PoeLearningArtifact_kind_status_idx" ON "PoeLearningArtifact"("kind", "status");

-- CreateIndex
CREATE INDEX "Evidence_enrollmentId_unitStandardId_idx" ON "Evidence"("enrollmentId", "unitStandardId");

-- CreateIndex
CREATE INDEX "WorkplaceLog_enrollmentId_logDate_idx" ON "WorkplaceLog"("enrollmentId", "logDate");

-- CreateIndex
CREATE INDEX "Assessment_enrollmentId_assessedAt_idx" ON "Assessment"("enrollmentId", "assessedAt");

-- CreateIndex
CREATE INDEX "Assessment_unitStandardId_result_idx" ON "Assessment"("unitStandardId", "result");

-- CreateIndex
CREATE UNIQUE INDEX "Moderation_assessmentId_key" ON "Moderation"("assessmentId");

-- CreateIndex
CREATE INDEX "Attendance_enrollmentId_sessionDate_idx" ON "Attendance"("enrollmentId", "sessionDate");

-- CreateIndex
CREATE INDEX "Document_enrollmentId_category_idx" ON "Document"("enrollmentId", "category");

-- CreateIndex
CREATE INDEX "Document_organisationId_category_idx" ON "Document"("organisationId", "category");

-- CreateIndex
CREATE INDEX "LearningMaterial_organisationId_poeComponent_idx" ON "LearningMaterial"("organisationId", "poeComponent");

-- CreateIndex
CREATE INDEX "LearningMaterial_organisationId_artifactSlug_idx" ON "LearningMaterial"("organisationId", "artifactSlug");

-- CreateIndex
CREATE INDEX "LearningMaterial_programmeId_idx" ON "LearningMaterial"("programmeId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkflowState_code_key" ON "WorkflowState"("code");

-- CreateIndex
CREATE UNIQUE INDEX "WorkflowState_order_key" ON "WorkflowState"("order");

-- CreateIndex
CREATE INDEX "EnrollmentWorkflow_enrollmentId_changedAt_idx" ON "EnrollmentWorkflow"("enrollmentId", "changedAt");

-- CreateIndex
CREATE INDEX "AssessmentQuestion_unitStandardId_orderIndex_idx" ON "AssessmentQuestion"("unitStandardId", "orderIndex");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_tokenHash_key" ON "RefreshToken"("tokenHash");

-- CreateIndex
CREATE INDEX "RefreshToken_userId_expiresAt_idx" ON "RefreshToken"("userId", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_tokenHash_key" ON "PasswordResetToken"("tokenHash");

-- CreateIndex
CREATE INDEX "PasswordResetToken_userId_idx" ON "PasswordResetToken"("userId");

-- CreateIndex
CREATE INDEX "InAppNotification_userId_readAt_createdAt_idx" ON "InAppNotification"("userId", "readAt", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_organisationId_entityType_createdAt_idx" ON "AuditLog"("organisationId", "entityType", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_actorId_createdAt_idx" ON "AuditLog"("actorId", "createdAt");

-- AddForeignKey
ALTER TABLE "UserOrganisation" ADD CONSTRAINT "UserOrganisation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserOrganisation" ADD CONSTRAINT "UserOrganisation_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserOrganisation" ADD CONSTRAINT "UserOrganisation_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnitStandard" ADD CONSTRAINT "UnitStandard_qualificationId_fkey" FOREIGN KEY ("qualificationId") REFERENCES "Qualification"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Outcome" ADD CONSTRAINT "Outcome_unitStandardId_fkey" FOREIGN KEY ("unitStandardId") REFERENCES "UnitStandard"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Programme" ADD CONSTRAINT "Programme_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Programme" ADD CONSTRAINT "Programme_qualificationId_fkey" FOREIGN KEY ("qualificationId") REFERENCES "Qualification"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_learnerId_fkey" FOREIGN KEY ("learnerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_programmeId_fkey" FOREIGN KEY ("programmeId") REFERENCES "Programme"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_sdioOrganisationId_fkey" FOREIGN KEY ("sdioOrganisationId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_employerOrganisationId_fkey" FOREIGN KEY ("employerOrganisationId") REFERENCES "Organisation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PoeLearningArtifact" ADD CONSTRAINT "PoeLearningArtifact_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "Enrollment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PoeLearningArtifact" ADD CONSTRAINT "PoeLearningArtifact_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PoeLearningArtifact" ADD CONSTRAINT "PoeLearningArtifact_facilitatorMarkedById_fkey" FOREIGN KEY ("facilitatorMarkedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PoeLearningArtifact" ADD CONSTRAINT "PoeLearningArtifact_assessorId_fkey" FOREIGN KEY ("assessorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PoeLearningArtifact" ADD CONSTRAINT "PoeLearningArtifact_submittedForModerationById_fkey" FOREIGN KEY ("submittedForModerationById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PoeLearningArtifact" ADD CONSTRAINT "PoeLearningArtifact_moderatorId_fkey" FOREIGN KEY ("moderatorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evidence" ADD CONSTRAINT "Evidence_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "Enrollment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evidence" ADD CONSTRAINT "Evidence_unitStandardId_fkey" FOREIGN KEY ("unitStandardId") REFERENCES "UnitStandard"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evidence" ADD CONSTRAINT "Evidence_outcomeId_fkey" FOREIGN KEY ("outcomeId") REFERENCES "Outcome"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evidence" ADD CONSTRAINT "Evidence_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkplaceLog" ADD CONSTRAINT "WorkplaceLog_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "Enrollment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assessment" ADD CONSTRAINT "Assessment_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "Enrollment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assessment" ADD CONSTRAINT "Assessment_unitStandardId_fkey" FOREIGN KEY ("unitStandardId") REFERENCES "UnitStandard"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Moderation" ADD CONSTRAINT "Moderation_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "Assessment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "Enrollment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "Enrollment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningMaterial" ADD CONSTRAINT "LearningMaterial_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningMaterial" ADD CONSTRAINT "LearningMaterial_programmeId_fkey" FOREIGN KEY ("programmeId") REFERENCES "Programme"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningMaterial" ADD CONSTRAINT "LearningMaterial_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnrollmentWorkflow" ADD CONSTRAINT "EnrollmentWorkflow_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "Enrollment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentQuestion" ADD CONSTRAINT "AssessmentQuestion_unitStandardId_fkey" FOREIGN KEY ("unitStandardId") REFERENCES "UnitStandard"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InAppNotification" ADD CONSTRAINT "InAppNotification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

