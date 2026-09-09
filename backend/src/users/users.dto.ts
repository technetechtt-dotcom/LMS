import { IsEmail, IsObject, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateUserDto {
  @IsEmail()
  email!: string;

  @IsString()
  firstName!: string;

  @IsString()
  lastName!: string;

  @IsUUID()
  roleId!: string;

  @IsOptional()
  @IsUUID()
  organisationId?: string;

  @IsOptional()
  @IsUUID()
  programmeId?: string;

  @IsOptional()
  @IsObject()
  enrollmentMetadata?: Record<string, unknown>;
}

export class AddUserMembershipDto {
  @IsUUID()
  userId!: string;

  @IsUUID()
  roleId!: string;

  /** Required for PLATFORM_ADMIN; ignored for organisation ADMIN (forced to active tenant). */
  @IsOptional()
  @IsUUID()
  organisationId?: string;
}
