import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import {
  PoeLearningArtifactKind,
  PoeModerationOutcome,
} from '@prisma/client';

export class CreatePoeLearningArtifactDto {
  @ApiProperty()
  @IsUUID()
  enrollmentId!: string;

  @ApiProperty({ enum: PoeLearningArtifactKind })
  @IsEnum(PoeLearningArtifactKind)
  kind!: PoeLearningArtifactKind;

  @ApiProperty()
  @IsString()
  @MaxLength(500)
  title!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  description?: string;
}

export class FacilitatorMarkDto {
  @ApiProperty({ description: 'Facilitator / blue-pen commentary' })
  @IsString()
  @MaxLength(8000)
  feedback!: string;
}

export class AllocateAssessorDto {
  @ApiProperty()
  @IsUUID()
  assessorId!: string;
}

export class AssessorReviewDto {
  @ApiProperty({ description: 'Assessor / red-pen commentary' })
  @IsString()
  @MaxLength(8000)
  feedback!: string;
}

export class SubmitModeratorDto {
  @ApiProperty()
  @IsUUID()
  moderatorId!: string;
}

export class ModeratorCompleteDto {
  @ApiProperty({ description: 'Moderator / green-pen commentary' })
  @IsString()
  @MaxLength(8000)
  feedback!: string;

  @ApiProperty({ enum: PoeModerationOutcome })
  @IsEnum(PoeModerationOutcome)
  outcome!: PoeModerationOutcome;
}
