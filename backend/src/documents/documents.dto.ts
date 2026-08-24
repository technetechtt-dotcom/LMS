import { IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateDocumentDto {
  @IsOptional()
  @IsUUID()
  enrollmentId?: string;

  @IsString()
  category!: string;

  @IsString()
  name!: string;

  @IsString()
  storageKey!: string;

  /** Optional display URL; server prefers regenerating signed URLs from storageKey. */
  @IsOptional()
  @IsString()
  url?: string;
}
