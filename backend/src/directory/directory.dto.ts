import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class DirectoryQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  roles?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  pageSize = 20;
}
