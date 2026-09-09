import { ModerationDecision } from '@prisma/client';
import { IsArray, IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateModerationDto {
  @IsUUID()
  assessmentId!: string;

  @IsEnum(ModerationDecision)
  decision!: ModerationDecision;

  @IsOptional()
  @IsString()
  @MaxLength(8000)
  feedback?: string;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  sampledRecordIds?: string[];
}

export class AllocateModeratorDto {
  @IsUUID()
  assessmentId!: string;

  @IsUUID()
  moderatorId!: string;
}
