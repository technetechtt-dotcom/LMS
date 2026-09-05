import { CompetencyResult } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';

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
  @IsUUID()
  moderatorId?: string;

  @IsOptional()
  @IsString()
  feedback?: string;
}

/** Generic PATCH — never accepts competency result. */
export class UpdateAssessmentDto {
  @IsOptional()
  @IsString()
  feedback?: string;

  @IsOptional()
  @IsArray()
  questions?: unknown[];
}

export class FinaliseAssessmentResultDto {
  @IsIn(['C', 'NYC'])
  result!: Extract<CompetencyResult, 'C' | 'NYC'>;

  @IsOptional()
  @IsString()
  feedback?: string;
}

export class HumanGradeItemDto {
  @IsUUID()
  questionId!: string;

  @IsNumber()
  @Min(0)
  score!: number;

  @IsOptional()
  @IsString()
  feedback?: string;
}

export class HumanGradeDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => HumanGradeItemDto)
  grades!: HumanGradeItemDto[];
}

export class ModerateSubmissionDto {
  @IsIn(['approve', 'reject'])
  decision!: 'approve' | 'reject';

  @IsOptional()
  @IsString()
  comments?: string;
}
