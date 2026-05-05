import { IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateDocumentDto {
  @IsOptional()
  @IsUUID()
  organisationId?: string;

  @IsOptional()
  @IsUUID()
  enrollmentId?: string;

  @IsString()
  category!: string;

  @IsString()
  name!: string;

  @IsString()
  storageKey!: string;

  @IsString()
  url!: string;
}
