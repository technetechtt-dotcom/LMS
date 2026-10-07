import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { AdminOnlyEndpoint } from '../common/decorators/admin-only-endpoint.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import type { AuthUser } from '../common/types/request-with-user';
import {
  CreateCohortDto,
  CreateProgrammeDto,
  CreateProgrammeModuleDto,
  FacilitatorAssignmentDto,
  ProgrammeCompletionRequirementsDto,
  ReorderModulesDto,
  UpdateCohortDto,
  UpdateProgrammeDetailsDto,
  UpdateProgrammeModuleDto,
  UpdateProgrammeStatusDto,
} from './programmes.dto';
import { ProgrammesService } from './programmes.service';

@ApiTags('Programmes & Qualifications')
@ApiBearerAuth()
@Controller()
export class ProgrammesController {
  constructor(private readonly programmes: ProgrammesService) {}

  @Get('qualifications')
  listQualifications() {
    return this.programmes.listQualifications();
  }

  @Get('programmes')
  list(@Req() req: Request & { user?: AuthUser }) {
    return this.programmes.list(req.user);
  }

  @Get('programmes/:id')
  byId(
    @Param('id') id: string,
    @Req() req: Request & { user?: AuthUser },
  ) {
    return this.programmes.byId(id, req.user);
  }

  @AdminOnlyEndpoint()
  @Roles('ADMIN')
  @Patch('programmes/:id')
  updateDetails(
    @Param('id') id: string,
    @Body() dto: UpdateProgrammeDetailsDto,
    @Req() req: Request & { user?: AuthUser },
  ) {
    return this.programmes.updateDetails(id, dto, req.user);
  }

  @Roles('ADMIN', 'QA_OFFICER', 'FACILITATOR')
  @Get('programmes/:id/completion-requirements')
  getCompletionRequirements(
    @Param('id') id: string,
    @Req() req: Request & { user?: AuthUser },
  ) {
    return this.programmes.getCompletionRequirements(id, req.user);
  }

  @Roles('ADMIN', 'QA_OFFICER')
  @Patch('programmes/:id/completion-requirements')
  @Put('programmes/:id/completion-requirements')
  setCompletionRequirements(
    @Param('id') id: string,
    @Body() dto: ProgrammeCompletionRequirementsDto,
    @Req() req: Request & { user?: AuthUser },
  ) {
    return this.programmes.setCompletionRequirements(id, dto, req.user);
  }

  @AdminOnlyEndpoint()
  @Roles('ADMIN')
  @Post('programmes')
  create(
    @Body() dto: CreateProgrammeDto,
    @Req() req: Request & { user?: AuthUser },
  ) {
    return this.programmes.create(dto, req.user);
  }

  @AdminOnlyEndpoint()
  @Roles('ADMIN')
  @Post('programmes/:id/modules')
  addModule(
    @Param('id') id: string,
    @Body() dto: CreateProgrammeModuleDto,
    @Req() req: Request & { user?: AuthUser },
  ) {
    return this.programmes.addModule(id, dto, req.user);
  }

  @AdminOnlyEndpoint()
  @Roles('ADMIN')
  @Patch('programmes/:id/modules/:moduleId')
  updateModule(
    @Param('id') id: string,
    @Param('moduleId') moduleId: string,
    @Body() dto: UpdateProgrammeModuleDto,
    @Req() req: Request & { user?: AuthUser },
  ) {
    return this.programmes.updateModule(id, moduleId, dto, req.user);
  }

  @AdminOnlyEndpoint()
  @Roles('ADMIN')
  @Delete('programmes/:id/modules/:moduleId')
  removeModule(
    @Param('id') id: string,
    @Param('moduleId') moduleId: string,
    @Req() req: Request & { user?: AuthUser },
  ) {
    return this.programmes.removeModule(id, moduleId, req.user);
  }

  @AdminOnlyEndpoint()
  @Roles('ADMIN')
  @Post('programmes/:id/modules/reorder')
  reorderModules(
    @Param('id') id: string,
    @Body() dto: ReorderModulesDto,
    @Req() req: Request & { user?: AuthUser },
  ) {
    return this.programmes.reorderModules(id, dto, req.user);
  }

  @AdminOnlyEndpoint()
  @Roles('ADMIN')
  @Patch('programmes/:id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateProgrammeStatusDto,
    @Req() req: Request & { user?: AuthUser },
  ) {
    return this.programmes.updateStatus(id, dto, req.user);
  }

  @AdminOnlyEndpoint()
  @Roles('ADMIN')
  @Post('facilitator-assignments')
  assignFacilitator(
    @Body() dto: FacilitatorAssignmentDto,
    @Req() req: Request & { user?: AuthUser },
  ) {
    return this.programmes.assignFacilitator(dto, req.user);
  }

  @Roles('ADMIN', 'FACILITATOR', 'QA_OFFICER')
  @Get('programmes/:id/facilitator-assignments')
  listFacilitatorAssignments(
    @Param('id') id: string,
    @Req() req: Request & { user?: AuthUser },
  ) {
    return this.programmes.listFacilitatorAssignments(id, req.user);
  }

  @AdminOnlyEndpoint()
  @Roles('ADMIN')
  @Delete('facilitator-assignments/:id')
  removeFacilitatorAssignment(
    @Param('id') id: string,
    @Req() req: Request & { user?: AuthUser },
  ) {
    return this.programmes.removeFacilitatorAssignment(id, req.user);
  }

  @Roles('ADMIN', 'FACILITATOR', 'QA_OFFICER', 'SETA', 'MENTOR')
  @Get('programmes/:id/cohorts')
  listCohorts(
    @Param('id') id: string,
    @Req() req: Request & { user?: AuthUser },
  ) {
    return this.programmes.listCohorts(id, req.user);
  }

  @AdminOnlyEndpoint()
  @Roles('ADMIN')
  @Post('programmes/:id/cohorts')
  createCohort(
    @Param('id') id: string,
    @Body() dto: CreateCohortDto,
    @Req() req: Request & { user?: AuthUser },
  ) {
    return this.programmes.createCohort(id, dto, req.user);
  }

  @AdminOnlyEndpoint()
  @Roles('ADMIN')
  @Patch('cohorts/:id')
  updateCohort(
    @Param('id') id: string,
    @Body() dto: UpdateCohortDto,
    @Req() req: Request & { user?: AuthUser },
  ) {
    return this.programmes.updateCohort(id, dto, req.user);
  }

  @AdminOnlyEndpoint()
  @Roles('ADMIN')
  @Delete('cohorts/:id')
  deleteCohort(
    @Param('id') id: string,
    @Req() req: Request & { user?: AuthUser },
  ) {
    return this.programmes.deleteCohort(id, req.user);
  }
}
