import { Controller, Get, Param, Res, StreamableFile } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { Public } from './decorators/public.decorator';
import { FileStorageService } from './file-storage.service';

@ApiTags('Storage')
@Controller('storage')
export class StorageController {
  constructor(private readonly files: FileStorageService) {}

  @Public()
  @Get(':token')
  async download(
    @Param('token') token: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const file = await this.files.openDownload(token);
    const safeName = file.fileName.replace(/[\r\n"]/g, '_');
    res.set({
      'Content-Type': file.mimeType,
      'Content-Disposition': `attachment; filename="${safeName}"`,
    });
    return new StreamableFile(file.stream);
  }
}
