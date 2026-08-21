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
import { memoryStorage } from 'multer';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { Roles } from '../common/decorators/roles.decorator';
import type { AuthUser } from '../common/types/request-with-user';
import { PoeService } from './poe.service';

@ApiTags('POE')
@ApiBearerAuth()
@Controller()
export class PoeController {
  constructor(private readonly poe: PoeService) {}

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
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 25 * 1024 * 1024 },
    }),
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
      throw new BadRequestException('metadata must be valid JSON');
    }
    const data = await this.poe.uploadDocument(
      learnerId,
      file,
      metadata,
      req.user,
    );
    return { success: true, data, message: 'Document uploaded' };
  }

  @Post('learners/:learnerId/poe-export')
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
