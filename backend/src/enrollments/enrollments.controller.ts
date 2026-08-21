import { Body, Controller, Delete, Get, Param, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { Roles } from '../common/decorators/roles.decorator';
import type { AuthUser } from '../common/types/request-with-user';
import { CreateEnrollmentDto, TransitionEnrollmentDto } from './enrollments.dto';
import { EnrollmentsService } from './enrollments.service';

@ApiTags('Enrollments')
@ApiBearerAuth()
@Controller('enrollments')
export class EnrollmentsController {
  constructor(private readonly enrollments: EnrollmentsService) {}

  @Get()
  list(@Req() req: Request & { user?: AuthUser }) {
    return this.enrollments.list(req.user);
  }

  @Post()
  create(
    @Body() dto: CreateEnrollmentDto,
    @Req() req: Request & { user?: AuthUser },
  ) {
    return this.enrollments.create(dto, req.user);
  }

  @Roles('ADMIN', 'FACILITATOR')
  @Delete(':id')
  remove(
    @Param('id') id: string,
    @Req() req: Request & { user?: AuthUser },
  ) {
    return this.enrollments.softDelete(id, req.user);
  }

  @Post(':id/transition')
  transition(
    @Param('id') id: string,
    @Body() dto: TransitionEnrollmentDto,
    @Req() req: Request & { user?: AuthUser },
  ) {
    return this.enrollments.transition(
      id,
      dto,
      req.user?.userId ?? 'system',
      req.user,
    );
  }
}
