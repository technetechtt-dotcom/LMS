import { Body, Controller, Get, Param, Post, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { Roles } from '../common/decorators/roles.decorator';
import type { AuthUser } from '../common/types/request-with-user';
import { AssessmentInstancesService } from './assessment-instances.service';

@ApiTags('Assessment instances')
@ApiBearerAuth()
@Controller('assessment-instances')
export class AssessmentInstancesController {
  constructor(private readonly instances: AssessmentInstancesService) {}

  @Roles('ADMIN', 'FACILITATOR', 'ASSESSOR', 'MODERATOR', 'QA_OFFICER')
  @Get()
  async list(
    @Req() req: Request & { user?: AuthUser },
    @Query('status') status?: string,
  ) {
    const data = await this.instances.list(req.user, status);
    return { success: true, data };
  }

  @Roles(
    'ADMIN',
    'FACILITATOR',
    'ASSESSOR',
    'MODERATOR',
    'QA_OFFICER',
    'LEARNER',
  )
  @Get(':id')
  async byId(
    @Param('id') id: string,
    @Req() req: Request & { user?: AuthUser },
  ) {
    const data = await this.instances.byId(id, req.user);
    return { success: true, data };
  }

  @Roles('LEARNER', 'ASSESSOR', 'ADMIN', 'FACILITATOR')
  @Post()
  async submit(
    @Body() body: Record<string, unknown>,
    @Req() req: Request & { user?: AuthUser },
  ) {
    const data = await this.instances.submit(body, req.user);
    return { success: true, data, message: 'Submitted' };
  }

  @Roles('ADMIN', 'ASSESSOR')
  @Post(':id/human-grade')
  async humanGrade(
    @Param('id') id: string,
    @Body()
    body: {
      grades?: Array<{
        questionId: string;
        score: number;
        maxScore?: number;
        feedback?: string;
      }>;
    },
    @Req() req: Request & { user?: AuthUser },
  ) {
    const data = await this.instances.humanGrade(
      id,
      body.grades ?? [],
      req.user,
    );
    return { success: true, data };
  }

  @Roles('ADMIN', 'ASSESSOR', 'MODERATOR')
  @Post(':id/moderate')
  async moderate(
    @Param('id') id: string,
    @Body() body: { decision?: string; comments?: string },
    @Req() req: Request & { user?: AuthUser },
  ) {
    const data = await this.instances.moderate(
      id,
      body.decision ?? 'approve',
      body.comments,
      req.user,
    );
    return {
      success: true,
      data,
      message: 'Moderated',
    };
  }
}
