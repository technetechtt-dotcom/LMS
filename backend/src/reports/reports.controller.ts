import { Controller, Get, Param, Query, Req, StreamableFile } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { Roles } from '../common/decorators/roles.decorator';
import type { AuthUser } from '../common/types/request-with-user';
import { ReportsService } from './reports.service';

@ApiTags('Reports')
@ApiBearerAuth()
@Controller('reports')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Roles('ADMIN', 'SETA', 'QA_OFFICER', 'FACILITATOR')
  @Get('progress')
  async progress(
    @Req() req: Request & { user?: AuthUser },
    @Query('format') format?: string,
  ) {
    const data = await this.reports.learnershipProgress(req.user);
    if (format === 'csv') {
      return new StreamableFile(Buffer.from(this.reports.progressToCsv(data), 'utf8'), {
        type: 'text/csv; charset=utf-8',
        disposition: 'attachment; filename="learnership-progress.csv"',
      });
    }
    return data;
  }

  @Roles('ADMIN', 'SETA', 'ASSESSOR', 'MODERATOR')
  @Get('poe/:enrollmentId')
  poe(
    @Param('enrollmentId') enrollmentId: string,
    @Req() req: Request & { user?: AuthUser },
  ) {
    return this.reports.learnerPoe(enrollmentId, req.user);
  }

  @Roles('ADMIN', 'SETA', 'FACILITATOR', 'QA_OFFICER')
  @Get('seta-snapshot')
  async setaSnapshot(
    @Req() req: Request & { user?: AuthUser },
    @Query('format') format?: string,
  ) {
    const data = await this.reports.setaSnapshot(req.user);
    if (format === 'csv') {
      return new StreamableFile(Buffer.from(this.reports.snapshotToCsv(data), 'utf8'), {
        type: 'text/csv; charset=utf-8',
        disposition: 'attachment; filename="seta-snapshot.csv"',
      });
    }
    if (format === 'pdf') {
      const pdf = await this.reports.snapshotToPdf(data);
      return new StreamableFile(pdf, {
        type: 'application/pdf',
        disposition: 'attachment; filename="seta-snapshot.pdf"',
      });
    }
    return data;
  }
}
