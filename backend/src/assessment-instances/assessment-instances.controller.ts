import { Body, Controller, Get, Param, Patch, Post, Query, Req, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { Roles } from '../common/decorators/roles.decorator';
import type { AuthUser } from '../common/types/request-with-user';
import { AssessmentInstancesService } from './assessment-instances.service';
import { HumanGradeDto, ModerateSubmissionDto } from '../assessments/assessments.dto';
import { quarantineUploadOptions } from '../common/quarantine-upload';
import { FileStorageService } from '../common/file-storage.service';

@ApiTags('Assessment instances')
@ApiBearerAuth()
@Controller('assessment-instances')
export class AssessmentInstancesController {
  constructor(
    private readonly instances: AssessmentInstancesService,
    private readonly files: FileStorageService,
  ) {}

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

  @Roles('ADMIN', 'FACILITATOR', 'ASSESSOR')
  @Post(':id/human-grade')
  async humanGrade(
    @Param('id') id: string,
    @Body() body: HumanGradeDto,
    @Req() req: Request & { user?: AuthUser },
  ) {
    const data = await this.instances.humanGrade(id, body.grades, req.user);
    return { success: true, data };
  }

  @Roles('LEARNER')
  @Post(':id/files')
  @Throttle({ default: { ttl: 60_000, limit: 20 } })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', quarantineUploadOptions({ maxFiles: 1, maxFields: 1 })),
  )
  async uploadFile(
    @Param('id') id: string,
    @Query('questionId') questionId: string,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: Request & { user?: AuthUser },
  ) {
    try {
      const data = await this.instances.uploadAnswerFile(id, questionId, file as never, req.user);
      return { success: true, data };
    } finally {
      await this.files.discardStaged(file as never);
    }
  }

  @Roles('LEARNER', 'ASSESSOR', 'ADMIN', 'FACILITATOR')
  @Patch(':id/progress')
  async saveProgress(
    @Param('id') id: string,
    @Body() body: { responses?: unknown[] },
    @Req() req: Request & { user?: AuthUser },
  ) {
    const data = await this.instances.saveProgress(
      id,
      body.responses ?? [],
      req.user,
    );
    return { success: true, data };
  }

  @Roles('ADMIN', 'FACILITATOR')
  @Post(':id/complete-facilitator-grading')
  async completeFacilitatorGrading(
    @Param('id') id: string,
    @Req() req: Request & { user?: AuthUser },
  ) {
    const data = await this.instances.completeFacilitatorGrading(id, req.user);
    return { success: true, data, message: 'Sent for assessor review' };
  }

  @Roles('ADMIN', 'ASSESSOR')
  @Post(':id/complete-grading')
  async completeGrading(
    @Param('id') id: string,
    @Req() req: Request & { user?: AuthUser },
  ) {
    const data = await this.instances.completeGrading(id, req.user);
    return { success: true, data, message: 'Grading complete' };
  }

  @Roles('ADMIN', 'MODERATOR', 'QA_OFFICER')
  @Post(':id/moderate')
  async moderate(
    @Param('id') id: string,
    @Body() body: ModerateSubmissionDto,
    @Req() req: Request & { user?: AuthUser },
  ) {
    const data = await this.instances.moderate(
      id,
      body.decision,
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
