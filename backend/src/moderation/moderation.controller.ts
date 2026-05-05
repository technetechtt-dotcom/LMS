import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { CreateModerationDto } from './moderation.dto';
import { ModerationService } from './moderation.service';

@ApiTags('Moderation')
@ApiBearerAuth()
@Controller('moderation')
export class ModerationController {
  constructor(private readonly moderation: ModerationService) {}

  @Get()
  list() {
    return this.moderation.list();
  }

  @Roles('MODERATOR', 'ADMIN')
  @Post()
  create(@Body() dto: CreateModerationDto) {
    return this.moderation.create(dto);
  }
}
