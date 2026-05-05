import { Body, Controller, Delete, Get, Param, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { CreateEnrollmentDto, TransitionEnrollmentDto } from './enrollments.dto';
import { EnrollmentsService } from './enrollments.service';

@ApiTags('Enrollments')
@ApiBearerAuth()
@Controller('enrollments')
export class EnrollmentsController {
  constructor(private readonly enrollments: EnrollmentsService) {}

  @Get()
  list() {
    return this.enrollments.list();
  }

  @Post()
  create(@Body() dto: CreateEnrollmentDto) {
    return this.enrollments.create(dto);
  }

  @Roles('ADMIN', 'FACILITATOR')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.enrollments.softDelete(id);
  }

  @Post(':id/transition')
  transition(
    @Param('id') id: string,
    @Body() dto: TransitionEnrollmentDto,
    @Req() req: Request & { user?: { userId?: string } },
  ) {
    return this.enrollments.transition(id, dto, req.user?.userId ?? 'system');
  }
}
