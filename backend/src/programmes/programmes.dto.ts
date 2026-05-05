import { ProgrammeKind } from '@prisma/client';
import { IsDateString, IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateProgrammeDto {
  @IsUUID()
  organisationId!: string;

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
