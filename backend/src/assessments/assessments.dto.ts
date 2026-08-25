import { CompetencyResult } from '@prisma/client';
import { IsEnum, IsNumber, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

/** Create opens an assessment instance — result is set only by grading workflow. */
export class CreateAssessmentDto {
  @IsUUID()
  enrollmentId!: string;

  @IsUUID()
  unitStandardId!: string;

  /** Optional; if omitted, authenticated assessor/admin is used. */
  @IsOptional()
  @IsUUID()
  assessorId?: string;

  @IsOptional()
  @IsString()
  feedback?: string;
}

export class FinaliseAssessmentResultDto {
  @IsEnum(CompetencyResult)
  result!: CompetencyResult;

  @IsOptional()
  @IsString()
  feedback?: string;
}

export class HumanGradeItemDto {
  @IsUUID()
  questionId!: string;

  @IsNumber()
  @Min(0)
  @Max(100)
  score!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxScore?: number;

  @IsOptional()
  @IsString()
  feedback?: string;
}
