import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CreateWorkplaceLogDto } from './workplace-logs.dto';
import { WorkplaceLogsService } from './workplace-logs.service';

@ApiTags('Workplace Logbook')
@ApiBearerAuth()
@Controller('workplace-logs')
export class WorkplaceLogsController {
  constructor(private readonly logs: WorkplaceLogsService) {}

  @Get()
  list(@Query('enrollmentId') enrollmentId?: string) {
    return this.logs.list(enrollmentId);
  }

  @Post()
  create(@Body() dto: CreateWorkplaceLogDto) {
    return this.logs.create(dto);
  }
}
