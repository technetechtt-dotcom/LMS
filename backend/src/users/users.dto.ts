import { IsBoolean, IsEmail, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export class CreateUserDto {
  @IsEmail()
  email!: string;

  @IsString()
  firstName!: string;

  @IsString()
  lastName!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
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
