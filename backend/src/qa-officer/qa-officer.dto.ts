import { IsArray, IsBoolean, IsDateString, IsEnum, IsIn, IsOptional, IsString, IsUUID, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export enum QaContractType {
  SETA = 'SETA',
  SDP = 'SDP',
  IMPLEMENTATION = 'IMPLEMENTATION',
}

export class RegisterContractDto {
  @IsEnum(QaContractType)
  contractType!: QaContractType;

  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  counterparty?: string;

  @IsOptional()
  @IsDateString()
  effectiveDate?: string;

  @IsOptional()
  @IsDateString()
  expiryDate?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class SignContractDto {
  @IsOptional()
  @IsString()
  signatureNotes?: string;
}

export class VettingChecksDto {
  @IsBoolean()
  idVerified!: boolean;

  @IsBoolean()
  popiaConsent!: boolean;

  @IsBoolean()
  qualificationMet!: boolean;

  @IsBoolean()
  documentsComplete!: boolean;
}

export class RecordVettingDto {
  @IsIn(['qualified', 'rejected'])
  decision!: 'qualified' | 'rejected';

  @ValidateNested()
  @Type(() => VettingChecksDto)
  checks!: VettingChecksDto;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class BulkLearnerRowDto {
  @IsString()
  email!: string;

  @IsString()
  firstName!: string;

  @IsString()
  lastName!: string;

  @IsUUID()
  programmeId!: string;

  @IsOptional()
  @IsString()
  idNumber?: string;

  @IsOptional()
  @IsString()
  phone?: string;
}

export class BulkImportLearnersDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkLearnerRowDto)
  learners!: BulkLearnerRowDto[];
}

export class ArrangePlacementDto {
  @IsUUID()
  employerOrganisationId!: string;

  @IsOptional()
  @IsUUID()
  workplaceMentorId?: string;

  @IsOptional()
  @IsDateString()
  placementStartDate?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
