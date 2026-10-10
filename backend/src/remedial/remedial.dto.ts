import { IsDateString, IsOptional, IsString, IsUUID } from 'class-validator';

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
