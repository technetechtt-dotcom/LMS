import { Body, Controller, Get, Param, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { Roles } from '../common/decorators/roles.decorator';
import type { AuthUser } from '../common/types/request-with-user';
import { CreateModerationDto, AllocateModeratorDto } from './moderation.dto';
import { ModerationService } from './moderation.service';

@ApiTags('Moderation')
@ApiBearerAuth()
@Controller('moderation')
export class ModerationController {
  constructor(private readonly moderation: ModerationService) {}

  @Roles('MODERATOR', 'ADMIN', 'QA_OFFICER', 'ASSESSOR')
  @Get()
  list(@Req() req: Request & { user?: AuthUser }) {
    return this.moderation.list(req.user);
  }

  @Roles('MODERATOR', 'ADMIN')
  @Post()
  create(
    @Body() dto: CreateModerationDto,
    @Req() req: Request & { user?: AuthUser },
  ) {
    return this.moderation.create(dto, req.user);
  }

  @Roles('ADMIN', 'QA_OFFICER', 'ASSESSOR')
  @Post('allocate')
  allocate(
    @Body() dto: AllocateModeratorDto,
    @Req() req: Request & { user?: AuthUser },
  ) {
    return this.moderation.allocate(dto, req.user);
  }

  @Roles('MODERATOR', 'ADMIN', 'QA_OFFICER', 'ASSESSOR')
  @Get('history/:assessmentId')
  history(
    @Param('assessmentId') assessmentId: string,
    @Req() req: Request & { user?: AuthUser },
  ) {
    return this.moderation.history(assessmentId, req.user);
  }
}
