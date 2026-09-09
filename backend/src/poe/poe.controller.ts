import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
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
import { PoeService } from './poe.service';
import { quarantineUploadOptions } from '../common/quarantine-upload';
import { FileStorageService } from '../common/file-storage.service';

@ApiTags('POE')
@ApiBearerAuth()
@Controller()
export class PoeController {
  constructor(
    private readonly poe: PoeService,
    private readonly files: FileStorageService,
  ) {}

  @Get('learners/:learnerId/poe-documents')
  list(
    @Param('learnerId') learnerId: string,
    @Req() req: Request & { user?: AuthUser },
  ) {
    return this.poe.listDocuments(learnerId, req.user);
  }

  @Get('learners/:learnerId/poe-overview')
  overview(
    @Param('learnerId') learnerId: string,
    @Req() req: Request & { user?: AuthUser },
  ) {
    return this.poe.officialPoeOverview(learnerId, req.user);
  }

  @Post('learners/:learnerId/poe-documents')
  @Throttle({ default: { ttl: 60_000, limit: 20 } })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', quarantineUploadOptions({ maxFiles: 1, maxFields: 4 })),
  )
  async upload(
    @Param('learnerId') learnerId: string,
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
      const data = await this.poe.uploadDocument(learnerId, file, metadata, req.user);
      return { success: true, data, message: 'Document uploaded' };
    } finally {
      await this.files.discardStaged(file as never);
    }
  }

  @Post('learners/:learnerId/poe-export')
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  async export(
    @Param('learnerId') learnerId: string,
    @Req() req: Request & { user?: AuthUser },
  ) {
    await this.poe.assertCanExport(learnerId, req.user);
    const data = this.poe.exportPoe(learnerId, req.user);
    return { success: true, data };
  }

  @Roles('ADMIN', 'FACILITATOR', 'ASSESSOR', 'MODERATOR', 'QA_OFFICER')
  @Post('poe-documents/:documentId/verify')
  async verify(
    @Param('documentId') documentId: string,
    @Req() req: Request & { user?: AuthUser },
  ) {
    const data = await this.poe.verifyDocument(documentId, req.user);
    return { success: true, data };
  }
}
