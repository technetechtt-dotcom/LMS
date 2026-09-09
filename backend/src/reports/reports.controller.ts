import { Body, Controller, Delete, Get, Param, Post, Query, Req, StreamableFile } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { Roles } from '../common/decorators/roles.decorator';
import type { AuthUser } from '../common/types/request-with-user';
import { ReportsService, type ReportFilters } from './reports.service';

@ApiTags('Reports')
@ApiBearerAuth()
@Controller('reports')
@Throttle({ default: { ttl: 60_000, limit: 20 } })
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
      const bytes = Buffer.from(this.reports.progressToCsv(data), 'utf8');
      await this.reports.recordDownload(bytes, 'learnership-progress', 'csv', {}, req.user);
      return new StreamableFile(bytes, {
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
    @Query() query?: Record<string, string | undefined>,
  ) {
    const data = await this.reports.setaSnapshot(req.user, this.filters(query ?? {}));
    if (format === 'csv') {
      const bytes = Buffer.from(this.reports.snapshotToCsv(data), 'utf8');
      await this.reports.recordDownload(bytes, 'seta-snapshot', 'csv', this.filters(query ?? {}), req.user);
      return new StreamableFile(bytes, {
        type: 'text/csv; charset=utf-8',
        disposition: 'attachment; filename="seta-snapshot.csv"',
      });
    }
    if (format === 'pdf') {
      const pdf = await this.reports.snapshotToPdf(data);
      await this.reports.recordDownload(pdf, 'seta-snapshot', 'pdf', this.filters(query ?? {}), req.user);
      return new StreamableFile(pdf, {
        type: 'application/pdf',
        disposition: 'attachment; filename="seta-snapshot.pdf"',
      });
    }
    return data;
  }

  private filters(query: Record<string, string | undefined>): ReportFilters {
    return {
      programmeId: query.programmeId || undefined,
      qualificationId: query.qualificationId || undefined,
      employerOrganisationId: query.employerOrganisationId || undefined,
      asOf: query.asOf || undefined,
    };
  }

  @Roles('ADMIN', 'SETA', 'QA_OFFICER', 'FACILITATOR')
  @Get('generated')
  async generated(@Req() req: Request & { user?: AuthUser }) {
    return this.reports.listGenerated(req.user);
  }

  @Roles('ADMIN', 'SETA', 'QA_OFFICER', 'FACILITATOR')
  @Post('generated')
  createGenerated(
    @Body() body: { reportType?: string; format?: string; filters?: ReportFilters },
    @Req() req: Request & { user?: AuthUser },
  ) {
    return this.reports.createGenerated(body, req.user);
  }

  @Roles('ADMIN', 'SETA', 'QA_OFFICER', 'FACILITATOR')
  @Delete('generated/:id')
  deleteGenerated(
    @Param('id') id: string,
    @Req() req: Request & { user?: AuthUser },
  ) {
    return this.reports.deleteGenerated(id, req.user);
  }

  @Roles('ADMIN', 'SETA', 'QA_OFFICER', 'FACILITATOR')
  @Get('generated/:id/download')
  async downloadGenerated(
    @Param('id') id: string,
    @Req() req: Request & { user?: AuthUser },
  ) {
    const file = await this.reports.generatedFile(id, req.user);
    return new StreamableFile(file.bytes, {
      type: file.type,
      disposition: `attachment; filename="${file.filename}"`,
    });
  }
}
