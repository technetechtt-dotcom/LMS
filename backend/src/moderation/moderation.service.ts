import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateModerationDto } from './moderation.dto';

@Injectable()
export class ModerationService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.moderation.findMany({ include: { assessment: true } });
  }

  create(dto: CreateModerationDto) {
    return this.prisma.moderation.create({ data: dto });
  }
}
