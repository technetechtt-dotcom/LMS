import { Body, Controller, Get, Post, Query, Req, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import type { AuthUser } from '../common/types/request-with-user';
import { FileStorageService } from '../common/file-storage.service';
import { quarantineUploadOptions } from '../common/quarantine-upload';
import { CreateEvidenceDto } from './evidence.dto';
import { EvidenceService } from './evidence.service';

@ApiTags('Evidence Upload')
@ApiBearerAuth()
@Controller('evidence')
export class EvidenceController {
  constructor(
    private readonly evidence: EvidenceService,
    private readonly files: FileStorageService,
  ) {}

  @Get()
  list(
    @Req() req: Request & { user?: AuthUser },
    @Query('enrollmentId') enrollmentId?: string,
  ) {
    return this.evidence.list(req.user, enrollmentId);
  }

  @Post()
  @Throttle({ default: { ttl: 60_000, limit: 20 } })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', quarantineUploadOptions({ maxFiles: 1, maxFields: 3 })),
  )
  async create(
    @Body() dto: CreateEvidenceDto,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Req() req: Request & { user?: AuthUser },
  ) {
    try {
      return await this.evidence.create(dto, file as never, req.user);
    } finally {
      await this.files.discardStaged(file as never);
    }
  }
}
