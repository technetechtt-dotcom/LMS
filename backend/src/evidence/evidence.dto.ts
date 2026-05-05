import { IsNumber, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateEvidenceDto {
  @IsUUID()
  enrollmentId!: string;

  @IsUUID()
  unitStandardId!: string;

  @IsOptional()
  @IsUUID()
  outcomeId?: string;

  @IsString()
  fileName!: string;

  @IsString()
  fileType!: string;

  @IsNumber()
  fileSize!: number;

  @IsString()
  storageKey!: string;

  @IsString()
  url!: string;
}
