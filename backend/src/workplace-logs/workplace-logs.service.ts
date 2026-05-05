import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWorkplaceLogDto } from './workplace-logs.dto';

@Injectable()
export class WorkplaceLogsService {
  constructor(private readonly prisma: PrismaService) {}

  list(enrollmentId?: string) {
    return this.prisma.workplaceLog.findMany({ where: { enrollmentId }, orderBy: { logDate: 'desc' } });
  }

  create(dto: CreateWorkplaceLogDto) {
    return this.prisma.workplaceLog.create({
      data: {
        ...dto,
        logDate: new Date(dto.logDate),
      },
    });
  }
}
