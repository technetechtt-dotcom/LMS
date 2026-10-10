import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { LearningProgressKind } from '@prisma/client';

export class RecordLearningProgressDto {
  @IsUUID()
  enrollmentId!: string;

  @IsOptional()
  @IsUUID()
  materialId?: string;

  @IsOptional()
  @IsString()
  moduleKey?: string;

  @IsEnum(LearningProgressKind)
  kind!: LearningProgressKind;
}
