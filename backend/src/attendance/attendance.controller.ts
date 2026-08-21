import { Body, Controller, Get, Post, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import type { AuthUser } from '../common/types/request-with-user';
import { AttendanceService } from './attendance.service';
import { CreateAttendanceDto } from './attendance.dto';

@ApiTags('Attendance')
@ApiBearerAuth()
@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendance: AttendanceService) {}

  @Get()
  list(
    @Req() req: Request & { user?: AuthUser },
    @Query('enrollmentId') enrollmentId?: string,
  ) {
    return this.attendance.list(req.user, enrollmentId);
  }

  @Post()
  create(
    @Body() dto: CreateAttendanceDto,
    @Req() req: Request & { user?: AuthUser },
  ) {
    return this.attendance.create(dto, req.user);
  }
}
