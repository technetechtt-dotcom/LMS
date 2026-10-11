-- AlterEnum LearnerLifecycleStatus
ALTER TYPE "LearnerLifecycleStatus" ADD VALUE IF NOT EXISTS 'SUSPENDED';
ALTER TYPE "LearnerLifecycleStatus" ADD VALUE IF NOT EXISTS 'WITHDRAWN';
ALTER TYPE "LearnerLifecycleStatus" ADD VALUE IF NOT EXISTS 'REJECTED';
ALTER TYPE "LearnerLifecycleStatus" ADD VALUE IF NOT EXISTS 'CANCELLED';

-- AlterEnum WorkflowAction
ALTER TYPE "WorkflowAction" ADD VALUE IF NOT EXISTS 'SUSPEND';
ALTER TYPE "WorkflowAction" ADD VALUE IF NOT EXISTS 'WITHDRAW';
ALTER TYPE "WorkflowAction" ADD VALUE IF NOT EXISTS 'REJECT';
ALTER TYPE "WorkflowAction" ADD VALUE IF NOT EXISTS 'CANCEL';
ALTER TYPE "WorkflowAction" ADD VALUE IF NOT EXISTS 'REINSTATE';

-- AlterTable RemedialAssignment staff override audit
ALTER TABLE "RemedialAssignment" ADD COLUMN IF NOT EXISTS "staffOverrideAt" TIMESTAMP(3);
ALTER TABLE "RemedialAssignment" ADD COLUMN IF NOT EXISTS "staffOverrideById" UUID;
ALTER TABLE "RemedialAssignment" ADD COLUMN IF NOT EXISTS "staffOverrideReason" TEXT;
ALTER TABLE "RemedialAssignment" ADD COLUMN IF NOT EXISTS "staffOverrideAction" TEXT;
