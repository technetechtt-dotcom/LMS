import { ProgrammeKind } from '@prisma/client';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

export class CreateProgrammeDto {
  @IsUUID()
  qualificationId!: string;

  @IsString()
  code!: string;

  @IsString()
  title!: string;

  @IsOptional()
  @IsEnum(ProgrammeKind)
  programmeKind?: ProgrammeKind;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}

/** Programme-specific completion rules stored in Programme.metadata.completionRequirements */
export class ProgrammeCompletionRequirementsDto {
  @IsOptional()
  @IsBoolean()
  requireAllAssessmentsC?: boolean;

  @IsOptional()
  @IsBoolean()
  requireWorkbook?: boolean;

  @IsOptional()
  @IsBoolean()
  requireSummative?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minVerifiedWorkplaceHours?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minAttendanceRatePercent?: number;
}
