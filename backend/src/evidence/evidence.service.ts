import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEvidenceDto } from './evidence.dto';

@Injectable()
export class EvidenceService {
  constructor(private readonly prisma: PrismaService) {}

  list(enrollmentId?: string) {
    return this.prisma.evidence.findMany({
      where: { deletedAt: null, enrollmentId },
      include: { unitStandard: true, outcome: true },
    });
  }

  create(dto: CreateEvidenceDto, uploadedById: string) {
    return this.prisma.evidence.create({
      data: {
        ...dto,
        uploadedById,
      },
    });
  }
}
