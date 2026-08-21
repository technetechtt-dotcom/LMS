import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { AnyFilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import type { AuthUser } from '../common/types/request-with-user';
import { MessagesService } from './messages.service';

@ApiTags('Messages')
@ApiBearerAuth()
@Controller('messages')
export class MessagesController {
  constructor(private readonly messages: MessagesService) {}

  @Get()
  async list(@Req() req: Request & { user?: AuthUser }) {
    const data = await this.messages.listForUser(req.user?.userId);
    return { success: true, data };
  }

  @Post()
  @ApiConsumes('multipart/form-data', 'application/json')
  @UseInterceptors(
    AnyFilesInterceptor({
      storage: memoryStorage(),
      limits: { fileSize: 25 * 1024 * 1024 },
    }),
  )
  async send(
    @Req() req: Request & { user?: AuthUser },
    @Body() body: { toId?: string; content?: string },
  ) {
    const toId = body.toId ?? (req.body as { toId?: string }).toId ?? '';
    const content = body.content ?? (req.body as { content?: string }).content ?? '';
    const data = await this.messages.send(req.user, toId, content);
    return { success: true, data };
  }
}
