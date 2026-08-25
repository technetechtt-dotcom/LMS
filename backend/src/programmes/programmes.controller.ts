import { Body, Controller, Get, Param, Patch, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { AdminOnlyEndpoint } from '../common/decorators/admin-only-endpoint.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import type { AuthUser } from '../common/types/request-with-user';
import {
  CreateProgrammeDto,
  ProgrammeCompletionRequirementsDto,
} from './programmes.dto';
import { ProgrammesService } from './programmes.service';

@ApiTags('Programmes & Qualifications')
@ApiBearerAuth()
@Controller('programmes')
export class ProgrammesController {
  constructor(private readonly programmes: ProgrammesService) {}

  @Get()
  list(@Req() req: Request & { user?: AuthUser }) {
    return this.programmes.list(req.user);
  }

  @Get(':id')
  byId(
    @Param('id') id: string,
    @Req() req: Request & { user?: AuthUser },
  ) {
    return this.programmes.byId(id, req.user);
  }

  @Roles('ADMIN', 'QA_OFFICER', 'FACILITATOR')
  @Get(':id/completion-requirements')
  getCompletionRequirements(
    @Param('id') id: string,
    @Req() req: Request & { user?: AuthUser },
  ) {
    return this.programmes.getCompletionRequirements(id, req.user);
  }

  @Roles('ADMIN', 'QA_OFFICER')
  @Patch(':id/completion-requirements')
  setCompletionRequirements(
    @Param('id') id: string,
    @Body() dto: ProgrammeCompletionRequirementsDto,
    @Req() req: Request & { user?: AuthUser },
  ) {
    return this.programmes.setCompletionRequirements(id, dto, req.user);
  }

  @AdminOnlyEndpoint()
  @Roles('ADMIN')
  @Post()
  create(
    @Body() dto: CreateProgrammeDto,
    @Req() req: Request & { user?: AuthUser },
  ) {
    return this.programmes.create(dto, req.user);
  }
}
