import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDocumentDto } from './documents.dto';

@Injectable()
export class DocumentsService {
  constructor(private readonly prisma: PrismaService) {}

  list(enrollmentId?: string) {
    return this.prisma.document.findMany({ where: { enrollmentId, deletedAt: null }, orderBy: { createdAt: 'desc' } });
  }

  create(dto: CreateDocumentDto) {
    return this.prisma.document.create({ data: dto });
  }
}
