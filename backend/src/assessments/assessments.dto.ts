import { CompetencyResult } from '@prisma/client';
import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateAssessmentDto {
  @IsUUID()
  enrollmentId!: string;

  @IsUUID()
  unitStandardId!: string;

  @IsUUID()
  assessorId!: string;

  @IsEnum(CompetencyResult)
  result!: CompetencyResult;

  @IsOptional()
  @IsString()
  feedback?: string;
}
