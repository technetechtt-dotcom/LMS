import { LearnerLifecycleStatus, WorkflowAction } from '@prisma/client';
import { IsDateString, IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateEnrollmentDto {
  @IsUUID()
  learnerId!: string;

  @IsUUID()
  programmeId!: string;

  /** Optional employer org — SDP org is always derived from the auth tenant. */
  @IsOptional()
  @IsUUID()
  employerOrganisationId?: string;
}

export class TransitionEnrollmentDto {
  @IsEnum(LearnerLifecycleStatus)
  toState!: LearnerLifecycleStatus;

  @IsEnum(WorkflowAction)
  action!: WorkflowAction;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsDateString()
  changedAt?: string;
}
