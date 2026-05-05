import { IsDateString, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { AttendanceStatus } from '@prisma/client';

export class CreateAttendanceDto {
  @IsUUID()
  enrollmentId!: string;

  @IsDateString()
  sessionDate!: string;

  @IsEnum(AttendanceStatus)
  status!: AttendanceStatus;

  @IsOptional()
  latitude?: number;

  @IsOptional()
  longitude?: number;
}
