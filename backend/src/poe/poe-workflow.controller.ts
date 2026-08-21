import { Body, Controller, Get, Param, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { PoeLearningArtifactKind } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import type { AuthUser } from '../common/types/request-with-user';
import {
  PoeWorkflowService,
  type PoeTransitionAction,
} from './poe-workflow.service';

@ApiTags('PoE workflow')
@ApiBearerAuth()
@Controller('poe-artifacts')
export class PoeWorkflowController {
  constructor(private readonly workflow: PoeWorkflowService) {}

  @Roles('ADMIN', 'FACILITATOR', 'ASSESSOR', 'MODERATOR', 'LEARNER', 'QA_OFFICER')
  @Get('by-enrollment/:enrollmentId')
  list(
    @Param('enrollmentId') enrollmentId: string,
    @Req() req: Request & { user?: AuthUser },
  ) {
    return this.workflow.list(enrollmentId, req.user);
  }

  @Roles('ADMIN', 'FACILITATOR')
  @Post()
  create(
    @Body()
    body: {
      enrollmentId: string;
      kind: PoeLearningArtifactKind;
      title: string;
      description?: string;
    },
    @Req() req: Request & { user?: AuthUser },
  ) {
    return this.workflow.create(body, req.user);
  }

  @Post(':id/transition')
  transition(
    @Param('id') id: string,
    @Body()
    body: {
      action: PoeTransitionAction;
      feedback?: string;
      assessorId?: string;
      moderatorId?: string;
    },
    @Req() req: Request & { user?: AuthUser },
  ) {
    return this.workflow.transition(id, body.action, body, req.user);
  }
}
