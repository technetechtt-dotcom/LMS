import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Req,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { Roles } from '../common/decorators/roles.decorator';
import type { AuthUser } from '../common/types/request-with-user';
import { ComplianceService } from './compliance.service';

@ApiTags('Compliance')
@ApiBearerAuth()
@Controller('compliance')
export class ComplianceController {
  constructor(private readonly compliance: ComplianceService) {}

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
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 25 * 1024 * 1024 },
    }),
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
      throw new BadRequestException('metadata must be valid JSON');
    }
    const data = await this.compliance.uploadDocument(file, metadata, req.user);
    return { success: true, data };
  }

  @Roles('ADMIN', 'QA_OFFICER', 'SETA')
  @Post('nlrd')
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
}
