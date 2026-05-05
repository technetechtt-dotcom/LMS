import { IsEnum, IsOptional, IsString } from 'class-validator';
import { OrganisationType } from '@prisma/client';

export class CreateOrganisationDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  registrationNo?: string;

  @IsEnum(OrganisationType)
  type!: OrganisationType;
}
