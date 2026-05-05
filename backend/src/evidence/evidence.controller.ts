import { Body, Controller, Get, Post, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CreateEvidenceDto } from './evidence.dto';
import { EvidenceService } from './evidence.service';

@ApiTags('Evidence Upload')
@ApiBearerAuth()
@Controller('evidence')
export class EvidenceController {
  constructor(private readonly evidence: EvidenceService) {}

  @Get()
  list(@Query('enrollmentId') enrollmentId?: string) {
    return this.evidence.list(enrollmentId);
  }

  @Post()
  create(
    @Body() dto: CreateEvidenceDto,
    @Req() req: Request & { user?: { userId?: string } },
  ) {
    return this.evidence.create(dto, req.user?.userId ?? 'system');
  }
}
