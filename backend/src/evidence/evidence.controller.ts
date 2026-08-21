import { Body, Controller, Get, Post, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import type { AuthUser } from '../common/types/request-with-user';
import { CreateEvidenceDto } from './evidence.dto';
import { EvidenceService } from './evidence.service';

@ApiTags('Evidence Upload')
@ApiBearerAuth()
@Controller('evidence')
export class EvidenceController {
  constructor(private readonly evidence: EvidenceService) {}

  @Get()
  list(
    @Req() req: Request & { user?: AuthUser },
    @Query('enrollmentId') enrollmentId?: string,
  ) {
    return this.evidence.list(req.user, enrollmentId);
  }

  @Post()
  create(
    @Body() dto: CreateEvidenceDto,
    @Req() req: Request & { user?: AuthUser },
  ) {
    return this.evidence.create(dto, req.user);
  }
}
