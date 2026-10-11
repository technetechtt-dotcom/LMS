import { BadRequestException, Body, Controller, Get, Post, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { Roles } from '../common/decorators/roles.decorator';
import type { AuthUser } from '../common/types/request-with-user';
import { RecordLearningProgressDto } from './learning-progress.dto';
import { LearningProgressService } from './learning-progress.service';

@ApiTags('Learning progress')
@ApiBearerAuth()
@Controller('learning-progress')
export class LearningProgressController {
  constructor(private readonly progress: LearningProgressService) {}

  @Roles('ADMIN', 'FACILITATOR', 'QA_OFFICER', 'ASSESSOR', 'MODERATOR', 'LEARNER')
  @Get()
  summary(
    @Query('enrollmentId') enrollmentId: string,
    @Req() req: Request & { user?: AuthUser },
  ) {
    if (!enrollmentId) {
      throw new BadRequestException('enrollmentId is required');
    }
    return this.progress.summary(enrollmentId, req.user);
  }

  @Roles('LEARNER')
  @Post()
  record(
    @Body() dto: RecordLearningProgressDto,
    @Req() req: Request & { user?: AuthUser },
  ) {
    return this.progress.record(dto, req.user);
  }
}
