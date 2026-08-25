import { LearnerLifecycleStatus, WorkflowAction } from '@prisma/client';
import { IsDateString, IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateEnrollmentDto {
  @IsUUID()
  learnerId!: string;

  @IsUUID()
  programmeId!: string;

  @IsOptional()
  @IsUUID()
  employerOrganisationId?: string;
}

export class TransitionEnrollmentDto {
  /** Canonical driver — server derives toState from this action. */
  @IsEnum(WorkflowAction)
  action!: WorkflowAction;

  /** Optional; if present must match the action's expected next state. */
  @IsOptional()
  @IsEnum(LearnerLifecycleStatus)
  toState?: LearnerLifecycleStatus;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsDateString()
  changedAt?: string;
}
