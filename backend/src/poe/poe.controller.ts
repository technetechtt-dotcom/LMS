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
import type { AuthUser } from '../common/types/request-with-user';
import { PoeService } from './poe.service';

@ApiTags('POE')
@ApiBearerAuth()
@Controller()
export class PoeController {
  constructor(private readonly poe: PoeService) {}

  @Get('learners/:learnerId/poe-documents')
  list(@Param('learnerId') learnerId: string) {
    return this.poe.listDocuments(learnerId);
  }

  @Get('learners/:learnerId/poe-overview')
  overview(@Param('learnerId') learnerId: string) {
    return this.poe.officialPoeOverview(learnerId);
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
    const userId = req.user?.userId;
    if (!userId) throw new BadRequestException('Authentication required');
    const data = await this.poe.uploadDocument(
      learnerId,
      file,
      metadata,
      userId,
    );
    return { success: true, data, message: 'Document uploaded' };
  }

  @Post('learners/:learnerId/poe-export')
  export(@Param('learnerId') learnerId: string) {
    const data = this.poe.exportPoe(learnerId);
    return { success: true, data };
  }

  @Post('poe-documents/:documentId/verify')
  verify(
    @Param('documentId') documentId: string,
    @Body('verifierId') verifierId: string,
  ) {
    if (!verifierId?.trim()) {
      throw new BadRequestException('verifierId is required');
    }
    const data = this.poe.verifyDocument(documentId, verifierId);
    return { success: true, data };
  }
}
