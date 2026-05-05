import { IsBoolean, IsEmail, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateUserDto {
  @IsEmail()
  email!: string;

  @IsString()
  firstName!: string;

  @IsString()
  lastName!: string;

  @IsString()
  passwordHash!: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class AddUserMembershipDto {
  @IsUUID()
  userId!: string;

  @IsUUID()
  roleId!: string;

  @IsUUID()
  organisationId!: string;
}
