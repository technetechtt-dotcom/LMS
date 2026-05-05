import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { AssessmentsService } from './assessments.service';
import { CreateAssessmentDto } from './assessments.dto';

@ApiTags('Assessments')
@ApiBearerAuth()
@Controller('assessments')
export class AssessmentsController {
  constructor(private readonly assessments: AssessmentsService) {}

  @Get()
  list() {
    return this.assessments.list();
  }

  @Get(':id/questions')
  questions(@Param('id') id: string) {
    return this.assessments.questions(id);
  }

  @Get(':id')
  byId(@Param('id') id: string) {
    return this.assessments.byId(id);
  }

  @Roles('ASSESSOR', 'ADMIN')
  @Post()
  create(@Body() dto: CreateAssessmentDto) {
    return this.assessments.create(dto);
  }
}
