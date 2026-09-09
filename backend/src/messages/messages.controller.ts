import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Req,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { AnyFilesInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import type { AuthUser } from '../common/types/request-with-user';
import { MessagesService } from './messages.service';
import { quarantineUploadOptions } from '../common/quarantine-upload';
import { FileStorageService } from '../common/file-storage.service';

@ApiTags('Messages')
@ApiBearerAuth()
@Controller('messages')
export class MessagesController {
  constructor(
    private readonly messages: MessagesService,
    private readonly fileStorage: FileStorageService,
  ) {}

  @Get()
  async list(@Req() req: Request & { user?: AuthUser }) {
    const data = await this.messages.listForUser(req.user);
    return { success: true, data };
  }

  @Post()
  @Throttle({ default: { ttl: 60_000, limit: 30 } })
  @ApiConsumes('multipart/form-data', 'application/json')
  @UseInterceptors(
    AnyFilesInterceptor(quarantineUploadOptions({ maxFiles: 2, maxFields: 4 })),
  )
  async send(
    @Req() req: Request & { user?: AuthUser },
    @Body() body: { toId?: string; content?: string },
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    const toId = body.toId ?? (req.body as { toId?: string }).toId ?? '';
    const content = body.content ?? (req.body as { content?: string }).content ?? '';
    try {
      const data = await this.messages.send(req.user, toId, content, files as never);
      return { success: true, data };
    } finally {
      await Promise.all((files ?? []).map((file) => this.fileStorage.discardStaged(file as never)));
    }
  }

  @Patch('read')
  async markRead(
    @Req() req: Request & { user?: AuthUser },
    @Body() body: { fromId?: string },
  ) {
    return this.messages.markFromPeerRead(req.user, body.fromId ?? '');
  }
}
