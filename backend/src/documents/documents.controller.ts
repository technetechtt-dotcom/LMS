import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CreateDocumentDto } from './documents.dto';
import { DocumentsService } from './documents.service';

@ApiTags('Documents')
@ApiBearerAuth()
@Controller('documents')
export class DocumentsController {
  constructor(private readonly docs: DocumentsService) {}

  @Get()
  list(@Query('enrollmentId') enrollmentId?: string) {
    return this.docs.list(enrollmentId);
  }

  @Post()
  create(@Body() dto: CreateDocumentDto) {
    return this.docs.create(dto);
  }
}
