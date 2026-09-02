import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

/** Same JSON shape as the reference Express API `metadata` field (multipart) or JSON body. */
export class CreateLearningMaterialDto {
  @ApiProperty()
  @IsString()
  @MaxLength(500)
  title!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  description?: string;

  @ApiProperty({ description: 'Programme this material belongs to (must exist for the organisation)' })
  @IsUUID()
  @IsNotEmpty()
  programmeId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(64)
  moduleCode?: string;

  @ApiPropertyOptional({
    description:
      'facilitator-guide | summative-memo | learner-guide | learner-workbook | summative | practical-* | workplace-* | other | na',
  })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  artifactSlug?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  artifactType?: string;

  @ApiPropertyOptional({
    description:
      'Knowledge | Assessment | Practical | Workplace | Compliance — workbook/summative KM PDFs default to Assessment',
  })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  poeComponent?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  programmeName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(64)
  moduleId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  moduleName?: string;

  @ApiPropertyOptional({ description: 'video | pdf | document | interactive | audio' })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  type?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(16)
  format?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fileUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fileSize?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  viewCount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  downloadCount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  completionCount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isApproved?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isAIEnhanced?: boolean;
}

export class ListMaterialsQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by programme UUID' })
  @IsOptional()
  @IsUUID()
  programmeId?: string;

  @ApiPropertyOptional({ description: 'knowledge | practical | workplace | compliance' })
  @IsOptional()
  @IsString()
  component?: string;

  @ApiPropertyOptional({
    description:
      'km-only | pm-only | wm-only | facilitator-guide | summative-memo | learner-guide | learner-workbook | summative | practical-guide | workplace-guide | other',
  })
  @IsOptional()
  @IsString()
  artifact?: string;
}

export class MaterialsMultipartDto {
  @ApiPropertyOptional({ description: 'JSON string of CreateLearningMaterialDto fields' })
  @IsOptional()
  @IsString()
  metadata?: string;
}
