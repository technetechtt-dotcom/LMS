import { IsDateString, IsIn, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export class CreateRemedialAssignmentDto {
  @IsUUID()
  enrollmentId!: string;

  @IsOptional()
  @IsUUID()
  materialId?: string;

  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  instructions?: string;

  @IsOptional()
  @IsDateString()
  dueAt?: string;
}

export class StaffOverrideRemedialDto {
  @IsIn(['acknowledge', 'complete'])
  action!: 'acknowledge' | 'complete';

  @IsString()
  @MinLength(8)
  reason!: string;
}
