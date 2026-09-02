import {
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

export class CreateInstrumentDto {
  @IsUUID()
  unitStandardId!: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  maxAttempts?: number;
}

export class UpdateInstrumentDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  maxAttempts?: number;
}

export class ReplaceInstrumentQuestionsDto {
  @IsArray()
  questions!: unknown[];
}
