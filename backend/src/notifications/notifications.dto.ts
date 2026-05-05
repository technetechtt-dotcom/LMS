import { IsBoolean, IsOptional } from 'class-validator';

export class MarkNotificationReadDto {
  @IsOptional()
  @IsBoolean()
  read?: boolean;
}
