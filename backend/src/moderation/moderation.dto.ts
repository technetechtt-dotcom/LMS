import { ModerationDecision } from '@prisma/client';
import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateModerationDto {
  @IsUUID()
  assessmentId!: string;

  @IsEnum(ModerationDecision)
  decision!: ModerationDecision;

  @IsOptional()
  @IsString()
  feedback?: string;
}

export class AllocateModeratorDto {
  @IsUUID()
  assessmentId!: string;

  @IsUUID()
  moderatorId!: string;
}
