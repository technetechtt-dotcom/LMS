import { IsOptional, IsUUID } from 'class-validator';

export class CreateEvidenceDto {
  @IsUUID()
  enrollmentId!: string;

  @IsUUID()
  unitStandardId!: string;

  @IsOptional()
  @IsUUID()
  outcomeId?: string;
}
