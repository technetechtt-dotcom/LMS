import { Controller, Get, Param, Post, Req, Res, StreamableFile } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import type { Request } from 'express';
import { Public } from './decorators/public.decorator';
import { FileStorageService } from './file-storage.service';
import type { AuthUser } from './types/request-with-user';
import { isPlatformAdmin, requireOrganisationId } from './tenant/tenant-scope';
import { Roles } from './decorators/roles.decorator';

@ApiTags('Storage')
@Controller('storage')
export class StorageController {
  constructor(private readonly files: FileStorageService) {}

  @Get('uploads/:id')
  state(
    @Param('id') id: string,
    @Req() req: Request & { user?: AuthUser },
  ) {
    const organisationId = isPlatformAdmin(req.user)
      ? undefined
      : requireOrganisationId(req.user);
    return this.files.getUploadState(id, organisationId);
  }

  @Post('retention/purge')
  @Roles('ADMIN', 'PLATFORM_ADMIN')
  purgeExpired(@Req() req: Request & { user?: AuthUser }) {
    const organisationId = isPlatformAdmin(req.user)
      ? undefined
      : requireOrganisationId(req.user);
    return this.files.purgeExpired(200, organisationId);
  }

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
