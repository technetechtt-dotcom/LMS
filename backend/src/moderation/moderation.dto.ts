import { ModerationDecision } from '@prisma/client';
import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateModerationDto {
  @IsUUID()
  assessmentId!: string;

  @IsUUID()
  moderatorId!: string;

  @IsEnum(ModerationDecision)
  decision!: ModerationDecision;

  @IsOptional()
  @IsString()
  feedback?: string;
}
