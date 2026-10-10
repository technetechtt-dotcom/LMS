import { IsDateString, IsNumber, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateWorkplaceLogDto {
  @IsUUID()
  enrollmentId!: string;

  @IsDateString()
  logDate!: string;

  @IsNumber()
  hoursWorked!: number;

  @IsString()
  activity!: string;

  @IsString()
  supervisorName!: string;

  @IsOptional()
  @IsString()
  supervisorEmail?: string;
}

export class UpdateWorkplaceLogDto {
  @IsOptional()
  @IsDateString()
  logDate?: string;

  @IsOptional()
  @IsNumber()
  hoursWorked?: number;

  @IsOptional()
  @IsString()
  activity?: string;

  @IsOptional()
  @IsString()
  supervisorName?: string;

  @IsOptional()
  @IsString()
  supervisorEmail?: string;
}
