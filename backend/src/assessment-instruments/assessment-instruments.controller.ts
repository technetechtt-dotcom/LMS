import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { Roles } from '../common/decorators/roles.decorator';
import type { AuthUser } from '../common/types/request-with-user';
import {
  CreateInstrumentDto,
  ReplaceInstrumentQuestionsDto,
  UpdateInstrumentDto,
} from './assessment-instruments.dto';
import { AssessmentInstrumentsService } from './assessment-instruments.service';

@ApiTags('Assessment instruments')
@ApiBearerAuth()
@Controller('assessment-instruments')
export class AssessmentInstrumentsController {
  constructor(private readonly instruments: AssessmentInstrumentsService) {}

  @Roles('ADMIN', 'FACILITATOR', 'ASSESSOR', 'QA_OFFICER')
  @Get('unit-standards/list')
  listUnitStandards(@Req() req: Request & { user?: AuthUser }) {
    return this.instruments.listUnitStandards(req.user);
  }

  @Roles('ADMIN', 'FACILITATOR', 'ASSESSOR', 'QA_OFFICER')
  @Get('by-unit/:unitStandardId')
  listByUnit(
    @Param('unitStandardId') unitStandardId: string,
    @Req() req: Request & { user?: AuthUser },
  ) {
    return this.instruments.listByUnitStandard(unitStandardId, req.user);
  }

  @Roles('ADMIN', 'FACILITATOR', 'ASSESSOR', 'QA_OFFICER')
  @Get(':id')
  byId(@Param('id') id: string, @Req() req: Request & { user?: AuthUser }) {
    return this.instruments.byId(id, req.user);
  }

  @Roles('ADMIN', 'FACILITATOR', 'ASSESSOR')
  @Post()
  create(@Body() dto: CreateInstrumentDto, @Req() req: Request & { user?: AuthUser }) {
    return this.instruments.createDraft(dto, req.user);
  }

  @Roles('ADMIN', 'FACILITATOR', 'ASSESSOR')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateInstrumentDto,
    @Req() req: Request & { user?: AuthUser },
  ) {
    return this.instruments.updateDraft(id, dto, req.user);
  }

  @Roles('ADMIN', 'FACILITATOR', 'ASSESSOR')
  @Post(':id/questions')
  replaceQuestions(
    @Param('id') id: string,
    @Body() dto: ReplaceInstrumentQuestionsDto,
    @Req() req: Request & { user?: AuthUser },
  ) {
    return this.instruments.replaceQuestions(id, dto, req.user);
  }

  @Roles('ADMIN', 'FACILITATOR', 'QA_OFFICER')
  @Post(':id/publish')
  publish(@Param('id') id: string, @Req() req: Request & { user?: AuthUser }) {
    return this.instruments.publish(id, req.user);
  }

  @Roles('ADMIN', 'QA_OFFICER')
  @Post(':id/retire')
  retire(@Param('id') id: string, @Req() req: Request & { user?: AuthUser }) {
    return this.instruments.retire(id, req.user);
  }
}
