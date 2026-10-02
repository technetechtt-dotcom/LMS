import { Body, Controller, Get, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { Roles } from '../common/decorators/roles.decorator';
import type { AuthUser } from '../common/types/request-with-user';
import { FeedbackService } from './feedback.service';

@ApiTags('Feedback')
@ApiBearerAuth()
@Controller('feedback')
export class FeedbackController {
  constructor(private readonly feedback: FeedbackService) {}

  @Post()
  create(
    @Body() body: { category?: string; rating?: number; message?: string },
    @Req() req: Request & { user?: AuthUser },
  ) {
    return this.feedback.create(body, req.user);
  }

  @Roles('ADMIN', 'QA_OFFICER')
  @Get()
  list(@Req() req: Request & { user?: AuthUser }) {
    return this.feedback.list(req.user);
  }
}
