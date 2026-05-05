import { Controller, Get, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { ReportsService } from './reports.service';

@ApiTags('Reports')
@ApiBearerAuth()
@Controller('reports')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Roles('ADMIN', 'SETA', 'QA_OFFICER')
  @Get('progress')
  progress() {
    return this.reports.learnershipProgress();
  }

  @Roles('ADMIN', 'SETA', 'ASSESSOR', 'MODERATOR')
  @Get('poe/:enrollmentId')
  poe(@Param('enrollmentId') enrollmentId: string) {
    return this.reports.learnerPoe(enrollmentId);
  }

  @Roles('ADMIN', 'SETA')
  @Get('seta-snapshot')
  setaSnapshot() {
    return this.reports.setaSnapshot();
  }
}
