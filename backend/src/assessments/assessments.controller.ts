import { Body, Controller, Get, Param, Patch, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { Roles } from '../common/decorators/roles.decorator';
import type { AuthUser } from '../common/types/request-with-user';
import { AssessmentsService } from './assessments.service';
import { AssessmentInstancesService } from '../assessment-instances/assessment-instances.service';
import { CreateAssessmentDto } from './assessments.dto';

@ApiTags('Assessments')
@ApiBearerAuth()
@Controller('assessments')
export class AssessmentsController {
  constructor(
    private readonly assessments: AssessmentsService,
    private readonly instances: AssessmentInstancesService,
  ) {}

  @Get()
  list(@Req() req: Request & { user?: AuthUser }) {
    return this.assessments.list(req.user);
  }

  @Roles('ASSESSOR', 'ADMIN', 'FACILITATOR', 'MODERATOR')
  @Post('auto-grade')
  async autoGrade(
    @Body() body: { responses?: unknown[]; unitStandardId?: string },
  ) {
    const responses = Array.isArray(body.responses)
      ? body.responses.map((raw) => {
          const r = raw as Record<string, unknown>;
          return {
            questionId: String(r.questionId ?? ''),
            questionType:
              typeof r.questionType === 'string' ? r.questionType : undefined,
            answer: r.answer,
          };
        })
      : [];
    const data = body.unitStandardId
      ? await this.instances.autoGradeAgainstBank(
          body.unitStandardId,
          responses,
        )
      : this.instances.autoGrade(responses);
    return { success: true, data };
  }

  @Get(':id/questions')
  questions(
    @Param('id') id: string,
    @Req() req: Request & { user?: AuthUser },
  ) {
    return this.assessments.questions(id, req.user);
  }

  @Get(':id')
  byId(
    @Param('id') id: string,
    @Req() req: Request & { user?: AuthUser },
  ) {
    return this.assessments.byId(id, req.user);
  }

  @Roles('ASSESSOR', 'ADMIN', 'FACILITATOR')
  @Post()
  create(
    @Body() dto: CreateAssessmentDto,
    @Req() req: Request & { user?: AuthUser },
  ) {
    return this.assessments.create(dto, req.user);
  }

  @Roles('ASSESSOR', 'ADMIN', 'FACILITATOR')
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
    @Req() req: Request & { user?: AuthUser },
  ) {
    const data = await this.assessments.update(id, body, req.user);
    return { success: true, data };
  }
}
