import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateProgrammeDto,
  CreateProgrammeModuleDto,
  FacilitatorAssignmentDto,
  ProgrammeCompletionRequirementsDto,
  ReorderModulesDto,
  UpdateProgrammeModuleDto,
  UpdateProgrammeStatusDto,
} from './programmes.dto';
import { mapProgrammeToApi, type ProgrammeWithRelations } from './programme.mapper';
import type { AuthUser } from '../common/types/request-with-user';
import { requireOrganisationId } from '../common/tenant/tenant-scope';

@Injectable()
export class ProgrammesService {
  constructor(private readonly prisma: PrismaService) {}

  async listQualifications() {
    return this.prisma.qualification.findMany({
      where: { deletedAt: null },
      include: {
        unitStandards: {
          where: { deletedAt: null },
        },
      },
      orderBy: { title: 'asc' },
    });
  }

  async list(user?: AuthUser) {
    const organisationId = requireOrganisationId(user);
    const rows = await this.prisma.programme.findMany({
      where: { deletedAt: null, organisationId },
      include: {
        qualification: true,
        organisation: true,
        modules: {
          where: { deletedAt: null },
          orderBy: { order: 'asc' },
        },
        facilitatorAssignments: {
          where: { deletedAt: null, isActive: true },
        },
        enrollments: {
          where: { deletedAt: null },
          select: { status: true, completedAt: true },
        },
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
        modules: {
          where: { deletedAt: null },
          orderBy: { order: 'asc' },
        },
        facilitatorAssignments: {
          where: { deletedAt: null, isActive: true },
        },
        enrollments: {
          where: { deletedAt: null },
          select: { status: true, completedAt: true },
        },
        _count: { select: { enrollments: true } },
      },
    });
    if (!row) throw new NotFoundException('Programme not found');
    return mapProgrammeToApi(row as ProgrammeWithRelations);
  }

  async create(dto: CreateProgrammeDto, user?: AuthUser) {
    const organisationId = requireOrganisationId(user);

    const qualification = await this.prisma.qualification.findFirst({
      where: { id: dto.qualificationId, deletedAt: null },
    });
    if (!qualification) {
      throw new NotFoundException('Selected qualification not found');
    }

    const created = await this.prisma.programme.create({
      data: {
        qualificationId: dto.qualificationId,
        code: dto.code,
        title: dto.title,
        status: dto.status || 'draft',
        programmeKind: dto.programmeKind,
        organisationId,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      },
      include: {
        qualification: true,
        organisation: true,
      },
    });
    return mapProgrammeToApi(created as ProgrammeWithRelations);
  }

  async addModule(
    programmeId: string,
    dto: CreateProgrammeModuleDto,
    user?: AuthUser,
  ) {
    const organisationId = requireOrganisationId(user);
    const programme = await this.prisma.programme.findFirst({
      where: { id: programmeId, deletedAt: null, organisationId },
    });
    if (!programme) throw new NotFoundException('Programme not found');

    const highestOrderModule = await this.prisma.programmeModule.findFirst({
      where: { programmeId, deletedAt: null },
      orderBy: { order: 'desc' },
      select: { order: true },
    });
    const nextOrder = dto.order ?? (highestOrderModule ? highestOrderModule.order + 1 : 1);

    return this.prisma.programmeModule.create({
      data: {
        programmeId,
        code: dto.code.trim().toUpperCase(),
        title: dto.title.trim(),
        moduleType: dto.moduleType,
        credits: dto.credits,
        order: nextOrder,
        unitStandardId: dto.unitStandardId,
        description: dto.description?.trim(),
      },
    });
  }

  async updateModule(
    programmeId: string,
    moduleId: string,
    dto: UpdateProgrammeModuleDto,
    user?: AuthUser,
  ) {
    const organisationId = requireOrganisationId(user);
    const programme = await this.prisma.programme.findFirst({
      where: { id: programmeId, deletedAt: null, organisationId },
    });
    if (!programme) throw new NotFoundException('Programme not found');

    const mod = await this.prisma.programmeModule.findFirst({
      where: { id: moduleId, programmeId, deletedAt: null },
    });
    if (!mod) throw new NotFoundException('Module not found');

    return this.prisma.programmeModule.update({
      where: { id: moduleId },
      data: {
        code: dto.code !== undefined ? dto.code.trim().toUpperCase() : undefined,
        title: dto.title !== undefined ? dto.title.trim() : undefined,
        moduleType: dto.moduleType,
        credits: dto.credits,
        order: dto.order,
        unitStandardId: dto.unitStandardId,
        description: dto.description !== undefined ? dto.description.trim() : undefined,
      },
    });
  }

  async removeModule(
    programmeId: string,
    moduleId: string,
    user?: AuthUser,
  ) {
    const organisationId = requireOrganisationId(user);
    const programme = await this.prisma.programme.findFirst({
      where: { id: programmeId, deletedAt: null, organisationId },
    });
    if (!programme) throw new NotFoundException('Programme not found');

    const mod = await this.prisma.programmeModule.findFirst({
      where: { id: moduleId, programmeId, deletedAt: null },
    });
    if (!mod) throw new NotFoundException('Module not found');

    return this.prisma.programmeModule.update({
      where: { id: moduleId },
      data: { deletedAt: new Date() },
    });
  }

  async reorderModules(
    programmeId: string,
    dto: ReorderModulesDto,
    user?: AuthUser,
  ) {
    const organisationId = requireOrganisationId(user);
    const programme = await this.prisma.programme.findFirst({
      where: { id: programmeId, deletedAt: null, organisationId },
    });
    if (!programme) throw new NotFoundException('Programme not found');

    await this.prisma.$transaction(
      dto.moduleIds.map((id, index) =>
        this.prisma.programmeModule.update({
          where: { id },
          data: { order: index + 1 },
        }),
      ),
    );
    return { ok: true, count: dto.moduleIds.length };
  }

  async updateStatus(
    programmeId: string,
    dto: UpdateProgrammeStatusDto,
    user?: AuthUser,
  ) {
    const organisationId = requireOrganisationId(user);
    const programme = await this.prisma.programme.findFirst({
      where: { id: programmeId, deletedAt: null, organisationId },
      include: {
        modules: {
          where: { deletedAt: null },
        },
      },
    });
    if (!programme) throw new NotFoundException('Programme not found');

    if (dto.status === 'active') {
      const types = new Set(programme.modules.map((m) => m.moduleType));
      if (!types.has('KNOWLEDGE') || !types.has('PRACTICAL') || !types.has('WORKPLACE')) {
        throw new BadRequestException(
          'Cannot activate programme without at least one Knowledge (KM), Practical (PM), and Workplace (WM) module.',
        );
      }
    }

    return this.prisma.programme.update({
      where: { id: programmeId },
      data: { status: dto.status },
    });
  }

  async setCompletionRequirements(
    id: string,
    dto: ProgrammeCompletionRequirementsDto,
    user?: AuthUser,
  ) {
    const organisationId = requireOrganisationId(user);
    const row = await this.prisma.programme.findFirst({
      where: { id, deletedAt: null, organisationId },
    });
    if (!row) throw new NotFoundException('Programme not found');
    const meta = (row.metadata as Record<string, unknown> | null) ?? {};
    const next = {
      ...meta,
      completionRequirements: {
        requireAllAssessmentsC: dto.requireAllAssessmentsC ?? true,
        requireWorkbook: dto.requireWorkbook ?? true,
        requireSummative: dto.requireSummative ?? true,
        minVerifiedWorkplaceHours: dto.minVerifiedWorkplaceHours ?? 0,
        minAttendanceRatePercent: dto.minAttendanceRatePercent ?? 0,
      },
    };
    return this.prisma.programme.update({
      where: { id },
      data: { metadata: next as Prisma.InputJsonValue },
    });
  }

  async getCompletionRequirements(id: string, user?: AuthUser) {
    const organisationId = requireOrganisationId(user);
    const row = await this.prisma.programme.findFirst({
      where: { id, deletedAt: null, organisationId },
      select: { id: true, metadata: true },
    });
    if (!row) throw new NotFoundException('Programme not found');
    const meta = (row.metadata as Record<string, unknown> | null) ?? {};
    return (
      meta.completionRequirements ?? {
        requireAllAssessmentsC: true,
        requireWorkbook: true,
        requireSummative: true,
        minVerifiedWorkplaceHours: 0,
        minAttendanceRatePercent: 0,
      }
    );
  }

  async assignFacilitator(dto: FacilitatorAssignmentDto, user?: AuthUser) {
    const organisationId = requireOrganisationId(user);
    return this.prisma.facilitatorAssignment.create({
      data: {
        organisationId,
        facilitatorId: dto.facilitatorId,
        programmeId: dto.programmeId,
        cohortId: dto.cohortId,
        moduleId: dto.moduleId,
        learnerId: dto.learnerId,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async listFacilitatorAssignments(programmeId: string, user?: AuthUser) {
    const organisationId = requireOrganisationId(user);
    return this.prisma.facilitatorAssignment.findMany({
      where: {
        programmeId,
        organisationId,
        deletedAt: null,
      },
      include: {
        facilitator: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });
  }

  async removeFacilitatorAssignment(assignmentId: string, user?: AuthUser) {
    const organisationId = requireOrganisationId(user);
    const existing = await this.prisma.facilitatorAssignment.findFirst({
      where: { id: assignmentId, organisationId, deletedAt: null },
    });
    if (!existing) throw new NotFoundException('Assignment not found');

    return this.prisma.facilitatorAssignment.update({
      where: { id: assignmentId },
      data: { deletedAt: new Date(), isActive: false },
    });
  }
}
