import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AttendanceService } from './attendance.service';
import { CreateAttendanceDto } from './attendance.dto';

@ApiTags('Attendance')
@ApiBearerAuth()
@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendance: AttendanceService) {}

  @Get()
  list(@Query('enrollmentId') enrollmentId?: string) {
    return this.attendance.list(enrollmentId);
  }

  @Post()
  create(@Body() dto: CreateAttendanceDto) {
    return this.attendance.create(dto);
  }
}
