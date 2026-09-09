import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Req,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { Roles } from '../common/decorators/roles.decorator';
import type { AuthUser } from '../common/types/request-with-user';
import { ComplianceService } from './compliance.service';
import { quarantineUploadOptions } from '../common/quarantine-upload';
import { FileStorageService } from '../common/file-storage.service';

@ApiTags('Compliance')
@ApiBearerAuth()
@Controller('compliance')
export class ComplianceController {
  constructor(
    private readonly compliance: ComplianceService,
    private readonly files: FileStorageService,
  ) {}

  @Roles('ADMIN', 'QA_OFFICER', 'SETA', 'FACILITATOR')
  @Get('documents')
  async documents(@Req() req: Request & { user?: AuthUser }) {
    const data = await this.compliance.listDocuments(req.user);
    return { success: true, data };
  }

  @Roles('ADMIN', 'QA_OFFICER', 'SETA', 'FACILITATOR')
  @Get('seta-submissions')
  async setaSubmissions(@Req() req: Request & { user?: AuthUser }) {
    const data = await this.compliance.listSetaSubmissions(req.user);
    return { success: true, data };
  }

  @Roles('ADMIN', 'QA_OFFICER', 'SETA', 'FACILITATOR')
  @Post('documents')
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', quarantineUploadOptions({ maxFiles: 1, maxFields: 4 })),
  )
  async upload(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body('metadata') metadataRaw: string | undefined,
    @Req() req: Request & { user?: AuthUser },
  ) {
    let metadata: Record<string, unknown> = {};
    try {
      if (metadataRaw?.trim()) {
        metadata = JSON.parse(metadataRaw) as Record<string, unknown>;
      }
    } catch {
      await this.files.discardStaged(file as never);
      throw new BadRequestException('metadata must be valid JSON');
    }
    try {
      const data = await this.compliance.uploadDocument(file as never, metadata, req.user);
      return { success: true, data };
    } finally {
      await this.files.discardStaged(file as never);
    }
  }

  @Roles('ADMIN', 'QA_OFFICER', 'SETA')
  @Post('nlrd')
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  async nlrd(
    @Body('programmeId') programmeId: string | undefined,
    @Req() req: Request & { user?: AuthUser },
  ) {
    const data = await this.compliance.generateNlrd(req.user, programmeId);
    return {
      success: true,
      data,
      message: data.valid
        ? 'NLRD export generated'
        : 'NLRD export generated with validation errors',
    };
  }

  @Roles('ADMIN', 'SETA')
  @Post('seta-export')
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  async setaExport(
    @Body() body: { setaId?: string; format?: string },
    @Req() req: Request & { user?: AuthUser },
  ) {
    const data = await this.compliance.exportSeta(
      req.user,
      body.setaId ?? 'default',
      body.format ?? 'xml',
    );
    return { success: true, data };
  }

  @Roles('ADMIN', 'QA_OFFICER', 'SETA', 'FACILITATOR')
  @Get('decisions')
  async decisions(@Req() req: Request & { user?: AuthUser }) {
    const data = await this.compliance.listDecisions(req.user);
    return { success: true, data };
  }

  @Roles('ADMIN', 'QA_OFFICER', 'SETA')
  @Put('decisions/:controlKey')
  async recordDecision(
    @Param('controlKey') controlKey: string,
    @Body() body: { status?: string; notes?: string; evidenceDocumentIds?: string[] },
    @Req() req: Request & { user?: AuthUser },
  ) {
    const data = await this.compliance.recordDecision(controlKey, body, req.user);
    return { success: true, data };
  }

  @Roles('ADMIN', 'QA_OFFICER', 'SETA')
  @Get('alerts')
  alerts(@Req() req: Request & { user?: AuthUser }) {
    return this.compliance.listAlerts(req.user);
  }

  @Roles('ADMIN', 'QA_OFFICER')
  @Post('alerts')
  createAlert(
    @Body() body: { controlKey?: string; title?: string; details?: string },
    @Req() req: Request & { user?: AuthUser },
  ) {
    return this.compliance.createAlert(body, req.user);
  }

  @Roles('ADMIN', 'QA_OFFICER')
  @Post('alerts/:id/acknowledge')
  acknowledgeAlert(@Param('id') id: string, @Req() req: Request & { user?: AuthUser }) {
    return this.compliance.acknowledgeAlert(id, req.user);
  }

  @Roles('ADMIN', 'QA_OFFICER')
  @Post('alerts/:id/resolve')
  resolveAlert(
    @Param('id') id: string,
    @Body() body: { notes?: string; evidenceDocumentIds?: string[] },
    @Req() req: Request & { user?: AuthUser },
  ) {
    return this.compliance.resolveAlert(id, body, req.user);
  }
}
