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
