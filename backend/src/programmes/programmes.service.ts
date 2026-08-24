import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProgrammeDto } from './programmes.dto';
import { mapProgrammeToApi, type ProgrammeWithRelations } from './programme.mapper';
import type { AuthUser } from '../common/types/request-with-user';
import { requireOrganisationId } from '../common/tenant/tenant-scope';

@Injectable()
export class ProgrammesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(user?: AuthUser) {
    const organisationId = requireOrganisationId(user);
    const rows = await this.prisma.programme.findMany({
      where: { deletedAt: null, organisationId },
      include: {
        qualification: true,
        organisation: true,
        _count: { select: { enrollments: true } },
      },
    });
    return rows.map((p) => mapProgrammeToApi(p as ProgrammeWithRelations));
  }

  async byId(id: string, user?: AuthUser) {
    const organisationId = requireOrganisationId(user);
    const row = await this.prisma.programme.findFirst({
      where: { id, deletedAt: null, organisationId },
      include: {
        qualification: true,
        organisation: true,
        enrollments: true,
        _count: { select: { enrollments: true } },
      },
    });
    if (!row) throw new NotFoundException('Programme not found');
    return mapProgrammeToApi(row as ProgrammeWithRelations);
  }

  create(dto: CreateProgrammeDto, user?: AuthUser) {
    const organisationId = requireOrganisationId(user);
    return this.prisma.programme.create({
      data: {
        qualificationId: dto.qualificationId,
        code: dto.code,
        title: dto.title,
        programmeKind: dto.programmeKind,
        organisationId,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      },
    });
  }
}
