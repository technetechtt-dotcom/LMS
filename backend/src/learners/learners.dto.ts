import {
  IsEmail,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class CreateLearnerDto {
  @IsEmail()
  email!: string;

  @ValidateIf((o: CreateLearnerDto) => !o.name)
  @IsString()
  @MinLength(1)
  firstName?: string;

  @ValidateIf((o: CreateLearnerDto) => !o.name)
  @IsString()
  @MinLength(1)
  lastName?: string;

  /** Full name — used when firstName/lastName not sent from FE. */
  @ValidateIf((o: CreateLearnerDto) => !o.firstName)
  @IsString()
  @MinLength(1)
  name?: string;

  @IsUUID()
  programmeId!: string;

  @IsOptional()
  @IsString()
  idNumber?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsNumber()
  progress?: number;
}

export class UpdateLearnerDto {
  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  idNumber?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsNumber()
  progress?: number;

  @IsOptional()
  @IsString()
  setaStatus?: string;

  @IsOptional()
  @IsUUID()
  programmeId?: string;

  @IsOptional()
  @IsString()
  name?: string;
}
