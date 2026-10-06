import { ModuleType, ProgrammeKind, ProgrammeStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';

export class CreateProgrammeDto {
  @IsUUID()
  qualificationId!: string;

  @IsString()
  code!: string;

  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(ProgrammeKind)
  programmeKind?: ProgrammeKind;

  @IsOptional()
  @IsEnum(ProgrammeStatus)
  status?: ProgrammeStatus;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateProgrammeModuleDto)
  modules?: CreateProgrammeModuleDto[];
}

export class UpdateProgrammeDetailsDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsEnum(ProgrammeKind)
  programmeKind?: ProgrammeKind;
}

export class CreateProgrammeModuleDto {
  @IsString()
  code!: string;

  @IsString()
  title!: string;

  @IsEnum(ModuleType)
  moduleType!: ModuleType;

  @IsInt()
  @Min(1)
  credits!: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  order?: number;

  @IsOptional()
  @IsUUID()
  unitStandardId?: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateProgrammeModuleDto {
  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsEnum(ModuleType)
  moduleType?: ModuleType;

  @IsOptional()
  @IsInt()
  @Min(1)
  credits?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  order?: number;

  @IsOptional()
  @IsUUID()
  unitStandardId?: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateProgrammeStatusDto {
  @IsEnum(ProgrammeStatus)
  status!: ProgrammeStatus;
}

export class ReorderModulesDto {
  @IsString({ each: true })
  moduleIds!: string[];
}

export class FacilitatorAssignmentDto {
  @IsUUID()
  facilitatorId!: string;

  @IsUUID()
  programmeId!: string;

  @IsOptional()
  @IsUUID()
  cohortId?: string;

  @IsOptional()
  @IsUUID()
  moduleId?: string;

  @IsOptional()
  @IsUUID()
  learnerId?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
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
