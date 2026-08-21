import { Body, Controller, Get, Post, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import type { AuthUser } from '../common/types/request-with-user';
import { CreateDocumentDto } from './documents.dto';
import { DocumentsService } from './documents.service';

@ApiTags('Documents')
@ApiBearerAuth()
@Controller('documents')
export class DocumentsController {
  constructor(private readonly docs: DocumentsService) {}

  @Get()
  list(
    @Req() req: Request & { user?: AuthUser },
    @Query('enrollmentId') enrollmentId?: string,
  ) {
    return this.docs.list(req.user, enrollmentId);
  }

  @Post()
  create(
    @Body() dto: CreateDocumentDto,
    @Req() req: Request & { user?: AuthUser },
  ) {
    return this.docs.create(dto, req.user);
  }
}
