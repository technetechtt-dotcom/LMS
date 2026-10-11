import { Body, Controller, Get, Param, Post, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { Roles } from '../common/decorators/roles.decorator';
import type { AuthUser } from '../common/types/request-with-user';
import { CreateRemedialAssignmentDto, StaffOverrideRemedialDto } from './remedial.dto';
import { RemedialService } from './remedial.service';

@ApiTags('Remedial assignments')
@ApiBearerAuth()
@Controller('remedial-assignments')
export class RemedialController {
  constructor(private readonly remedial: RemedialService) {}

  @Get()
  list(
    @Req() req: Request & { user?: AuthUser },
    @Query('enrollmentId') enrollmentId?: string,
  ) {
    return this.remedial.list(req.user, enrollmentId);
  }

  @Roles('ADMIN', 'FACILITATOR', 'QA_OFFICER', 'ASSESSOR')
  @Post()
  create(
    @Body() dto: CreateRemedialAssignmentDto,
    @Req() req: Request & { user?: AuthUser },
  ) {
    return this.remedial.create(dto, req.user);
  }

  @Roles('LEARNER')
  @Post(':id/acknowledge')
  acknowledge(
    @Param('id') id: string,
    @Req() req: Request & { user?: AuthUser },
  ) {
    return this.remedial.acknowledge(id, req.user);
  }

  @Roles('LEARNER')
  @Post(':id/complete')
  complete(
    @Param('id') id: string,
    @Req() req: Request & { user?: AuthUser },
  ) {
    return this.remedial.complete(id, req.user);
  }

  @Roles('ADMIN', 'FACILITATOR', 'QA_OFFICER', 'ASSESSOR')
  @Post(':id/staff-override')
  staffOverride(
    @Param('id') id: string,
    @Body() dto: StaffOverrideRemedialDto,
    @Req() req: Request & { user?: AuthUser },
  ) {
    return this.remedial.staffOverride(id, dto, req.user);
  }
}
