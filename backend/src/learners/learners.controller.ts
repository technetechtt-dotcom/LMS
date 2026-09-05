import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { Roles } from '../common/decorators/roles.decorator';
import type { AuthUser } from '../common/types/request-with-user';
import { requireOrganisationId } from '../common/tenant/tenant-scope';
import { CreateLearnerDto, UpdateLearnerDto } from './learners.dto';
import { LearnersService } from './learners.service';

@ApiTags('Learners')
@ApiBearerAuth()
@Controller('learners')
export class LearnersController {
  constructor(private readonly learners: LearnersService) {}

  @Roles(
    'ADMIN',
    'FACILITATOR',
    'ASSESSOR',
    'MODERATOR',
    'QA_OFFICER',
    'SETA',
    'MENTOR',
  )
  @Get()
  list(
    @Req() req: Request & { user?: AuthUser },
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('programme') programme?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    const organisationId = requireOrganisationId(req.user);
    return this.learners.list(
      { search, status, programme, dateFrom, dateTo },
      organisationId,
      req.user,
    );
  }

  @Roles(
    'ADMIN',
    'FACILITATOR',
    'ASSESSOR',
    'MODERATOR',
    'QA_OFFICER',
    'SETA',
    'LEARNER',
    'MENTOR',
  )
  @Get(':id')
  byId(
    @Param('id') id: string,
    @Req() req: Request & { user?: AuthUser },
  ) {
    const organisationId = requireOrganisationId(req.user);
    return this.learners.byId(id, organisationId, req.user);
  }

  @Roles('ADMIN', 'FACILITATOR', 'QA_OFFICER')
  @Post()
  async create(
    @Body() dto: CreateLearnerDto,
    @Req() req: Request & { user?: AuthUser },
  ) {
    const data = await this.learners.create(dto, req.user);
    return { success: true, data };
  }

  @Roles('ADMIN', 'FACILITATOR', 'QA_OFFICER')
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateLearnerDto,
    @Req() req: Request & { user?: AuthUser },
  ) {
    const data = await this.learners.update(id, dto, req.user);
    return { success: true, data };
  }
}
