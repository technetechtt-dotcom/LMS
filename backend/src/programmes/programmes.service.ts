import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, ProgrammeStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateCohortDto,
  CreateProgrammeDto,
  CreateProgrammeModuleDto,
  FacilitatorAssignmentDto,
  ProgrammeCompletionRequirementsDto,
  ReorderModulesDto,
  UpdateCohortDto,
  UpdateProgrammeDetailsDto,
  UpdateProgrammeModuleDto,
  UpdateProgrammeStatusDto,
} from './programmes.dto';
import { mapProgrammeToApi, type ProgrammeWithRelations } from './programme.mapper';
import type { AuthUser } from '../common/types/request-with-user';
import { programmeActorWhere, requireOrganisationId } from '../common/tenant/tenant-scope';

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
      where: {
        deletedAt: null,
        organisationId,
        ...programmeActorWhere(user),
      },
      include: {
        qualification: true,
        organisation: true,
        modules: {
          where: { deletedAt: null },
          orderBy: { order: 'asc' },
        },
        facilitatorAssignments: {
          where: { deletedAt: null, isActive: true },
          include: {
            facilitator: {
              select: { id: true, firstName: true, lastName: true, email: true },
            },
            module: { select: { id: true, code: true, title: true } },
            cohort: { select: { id: true, name: true } },
            learner: { select: { id: true, firstName: true, lastName: true, email: true } },
          },
        },
        enrollments: {
          where: { deletedAt: null },
          select: { status: true, completedAt: true },
        },
        _count: { select: { enrollments: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((p) => mapProgrammeToApi(p as ProgrammeWithRelations));
  }

  async byId(id: string, user?: AuthUser) {
    const organisationId = requireOrganisationId(user);
    const row = await this.prisma.programme.findFirst({
      where: {
        id,
        deletedAt: null,
        organisationId,
        ...programmeActorWhere(user),
      },
      include: {
        qualification: true,
        organisation: true,
        modules: {
          where: { deletedAt: null },
          orderBy: { order: 'asc' },
        },
        facilitatorAssignments: {
          where: { deletedAt: null, isActive: true },
          include: {
            facilitator: {
              select: { id: true, firstName: true, lastName: true, email: true },
            },
            module: { select: { id: true, code: true, title: true } },
            cohort: { select: { id: true, name: true } },
            learner: { select: { id: true, firstName: true, lastName: true, email: true } },
          },
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

    const trimmedCode = dto.code.trim().toUpperCase();
    const existing = await this.prisma.programme.findFirst({
      where: {
        organisationId,
        code: trimmedCode,
        deletedAt: null,
      },
    });
    if (existing) {
      throw new BadRequestException({
        field: 'code',
        message: `Programme code '${trimmedCode}' is already in use within this organisation.`,
      });
    }

    const qualification = await this.prisma.qualification.findFirst({
      where: { id: dto.qualificationId, deletedAt: null },
    });
    if (!qualification) {
      throw new NotFoundException({
        field: 'qualificationId',
        message: 'Selected qualification not found',
      });
    }

    if (dto.nqfLevel !== undefined || dto.credits !== undefined || dto.seta !== undefined) {
      await this.prisma.qualification.update({
        where: { id: dto.qualificationId },
        data: {
          ...(dto.nqfLevel !== undefined ? { nqfLevel: dto.nqfLevel } : {}),
          ...(dto.credits !== undefined ? { totalCredits: dto.credits } : {}),
          ...(dto.seta !== undefined && dto.seta.trim() ? { seta: dto.seta.trim() } : {}),
        },
      });
    }

    const created = await this.prisma.$transaction(async (tx) => {
      const prog = await tx.programme.create({
        data: {
          qualificationId: dto.qualificationId,
          code: trimmedCode,
          title: dto.title.trim(),
          description: dto.description?.trim(),
          status: dto.status || ProgrammeStatus.draft,
          programmeKind: dto.programmeKind,
          organisationId,
          startDate: dto.startDate ? new Date(dto.startDate) : undefined,
          endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        },
      });

      if (dto.modules && dto.modules.length > 0) {
        let order = 1;
        for (const mod of dto.modules) {
          if (!mod.code?.trim() || !mod.title?.trim() || !mod.credits || mod.credits < 1) {
            throw new BadRequestException({
              field: 'modules',
              message: `Module "${mod.title || 'untitled'}" is missing required code, title, or valid credits.`,
            });
          }
          await tx.programmeModule.create({
            data: {
              programmeId: prog.id,
              code: mod.code.trim().toUpperCase(),
              title: mod.title.trim(),
              moduleType: mod.moduleType,
              credits: mod.credits,
              order: mod.order ?? order++,
              unitStandardId: mod.unitStandardId,
              description: mod.description?.trim(),
            },
          });
        }
      }

      return tx.programme.findUnique({
        where: { id: prog.id },
        include: {
          qualification: true,
          organisation: true,
          modules: { where: { deletedAt: null }, orderBy: { order: 'asc' } },
          facilitatorAssignments: { where: { deletedAt: null, isActive: true } },
          enrollments: { where: { deletedAt: null }, select: { status: true, completedAt: true } },
          _count: { select: { enrollments: true } },
        },
      });
    });

    return mapProgrammeToApi(created as ProgrammeWithRelations);
  }

  async updateDetails(id: string, dto: UpdateProgrammeDetailsDto, user?: AuthUser) {
    const organisationId = requireOrganisationId(user);
    const existing = await this.prisma.programme.findFirst({
      where: { id, organisationId, deletedAt: null },
    });
    if (!existing) throw new NotFoundException('Programme not found');

    if (dto.code && dto.code.trim().toUpperCase() !== existing.code) {
      const codeDuplicate = await this.prisma.programme.findFirst({
        where: {
          organisationId,
          code: dto.code.trim().toUpperCase(),
          deletedAt: null,
          id: { not: id },
        },
      });
      if (codeDuplicate) {
        throw new BadRequestException({
          field: 'code',
          message: `Programme code '${dto.code.trim().toUpperCase()}' is already in use.`,
        });
      }
    }

    const updated = await this.prisma.programme.update({
      where: { id },
      data: {
        title: dto.title !== undefined ? dto.title.trim() : undefined,
        code: dto.code !== undefined ? dto.code.trim().toUpperCase() : undefined,
        description: dto.description !== undefined ? dto.description.trim() : undefined,
        startDate: dto.startDate !== undefined ? (dto.startDate ? new Date(dto.startDate) : null) : undefined,
        endDate: dto.endDate !== undefined ? (dto.endDate ? new Date(dto.endDate) : null) : undefined,
        programmeKind: dto.programmeKind !== undefined ? dto.programmeKind : undefined,
      },
      include: {
        qualification: true,
        organisation: true,
        modules: { where: { deletedAt: null }, orderBy: { order: 'asc' } },
        facilitatorAssignments: { where: { deletedAt: null, isActive: true } },
        enrollments: { where: { deletedAt: null }, select: { status: true, completedAt: true } },
        _count: { select: { enrollments: true } },
      },
    });

    return mapProgrammeToApi(updated as ProgrammeWithRelations);
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

    const uniqueIds = new Set(dto.moduleIds);
    if (uniqueIds.size !== dto.moduleIds.length) {
      throw new BadRequestException('Duplicate module IDs provided in reorder list');
    }

    const existingModules = await this.prisma.programmeModule.findMany({
      where: {
        programmeId,
        deletedAt: null,
        programme: { organisationId },
      },
      select: { id: true },
    });

    const existingIdSet = new Set(existingModules.map((m) => m.id));
    if (dto.moduleIds.length !== existingModules.length) {
      throw new BadRequestException(
        `Reorder list must contain exactly all ${existingModules.length} programme modules without omissions or additions.`,
      );
    }
    for (const id of dto.moduleIds) {
      if (!existingIdSet.has(id)) {
        throw new BadRequestException(`Module ID ${id} does not belong to this programme and organisation.`);
      }
    }

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

    const currentStatus = programme.status as ProgrammeStatus;
    const targetStatus = dto.status;

    if (currentStatus === ProgrammeStatus.archived && targetStatus === ProgrammeStatus.draft) {
      throw new BadRequestException('Archived programmes cannot be transitioned back to draft.');
    }

    if (targetStatus === ProgrammeStatus.active) {
      const types = new Set(programme.modules.map((m) => m.moduleType));
      if (!types.has('KNOWLEDGE') || !types.has('PRACTICAL') || !types.has('WORKPLACE')) {
        throw new BadRequestException(
          'Cannot activate programme without at least one Knowledge (KM), Practical (PM), and Workplace (WM) module.',
        );
      }
    }

    return this.prisma.programme.update({
      where: { id: programmeId },
      data: { status: targetStatus },
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
      where: {
        id,
        deletedAt: null,
        organisationId,
        ...programmeActorWhere(user),
      },
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

    const programme = await this.prisma.programme.findFirst({
      where: { id: dto.programmeId, organisationId, deletedAt: null },
    });
    if (!programme) {
      throw new NotFoundException('Programme not found in active organisation');
    }

    const membership = await this.prisma.userOrganisation.findFirst({
      where: {
        userId: dto.facilitatorId,
        organisationId,
        role: { code: 'FACILITATOR' },
        deletedAt: null,
      },
      include: { user: true },
    });
    if (!membership || !membership.user || membership.user.deletedAt) {
      throw new BadRequestException('Selected user is not an active Facilitator in this organisation');
    }

    if (dto.moduleId) {
      const mod = await this.prisma.programmeModule.findFirst({
        where: { id: dto.moduleId, programmeId: dto.programmeId, deletedAt: null },
      });
      if (!mod) {
        throw new BadRequestException('Selected module does not belong to this programme');
      }
    }

    if (dto.cohortId) {
      const cohort = await this.prisma.cohort.findFirst({
        where: { id: dto.cohortId, programmeId: dto.programmeId, organisationId, deletedAt: null },
      });
      if (!cohort) {
        throw new BadRequestException('Selected cohort does not belong to this programme');
      }
    }

    if (dto.learnerId) {
      const enrollment = await this.prisma.enrollment.findFirst({
        where: {
          learnerId: dto.learnerId,
          programmeId: dto.programmeId,
          deletedAt: null,
          OR: [
            { sdioOrganisationId: organisationId },
            { employerOrganisationId: organisationId },
            { programme: { organisationId } },
          ],
        },
      });
      if (!enrollment) {
        throw new BadRequestException('Selected learner is not enrolled in this programme');
      }
    }

    let startDate: Date | undefined;
    let endDate: Date | undefined;
    if (dto.startDate) {
      startDate = new Date(dto.startDate);
      if (Number.isNaN(startDate.getTime())) throw new BadRequestException('Invalid startDate');
    }
    if (dto.endDate) {
      endDate = new Date(dto.endDate);
      if (Number.isNaN(endDate.getTime())) throw new BadRequestException('Invalid endDate');
    }
    if (startDate && endDate && startDate > endDate) {
      throw new BadRequestException('Assignment startDate cannot be after endDate');
    }

    const duplicate = await this.prisma.facilitatorAssignment.findFirst({
      where: {
        organisationId,
        programmeId: dto.programmeId,
        facilitatorId: dto.facilitatorId,
        moduleId: dto.moduleId ?? null,
        cohortId: dto.cohortId ?? null,
        learnerId: dto.learnerId ?? null,
        isActive: true,
        deletedAt: null,
      },
    });
    if (duplicate) {
      throw new BadRequestException('An active facilitator assignment with the exact same scope already exists');
    }

    const assignment = await this.prisma.facilitatorAssignment.create({
      data: {
        organisationId,
        facilitatorId: dto.facilitatorId,
        programmeId: dto.programmeId,
        cohortId: dto.cohortId,
        moduleId: dto.moduleId,
        learnerId: dto.learnerId,
        startDate,
        endDate,
        isActive: dto.isActive ?? true,
      },
      include: {
        facilitator: { select: { id: true, firstName: true, lastName: true, email: true } },
        module: { select: { id: true, code: true, title: true } },
        cohort: { select: { id: true, name: true } },
        learner: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

    await this.prisma.auditLog.create({
      data: {
        organisationId,
        actorId: user?.userId,
        action: 'FACILITATOR_ASSIGNMENT_CREATED',
        entityType: 'FacilitatorAssignment',
        entityId: assignment.id,
        afterValue: {
          programmeId: dto.programmeId,
          facilitatorId: dto.facilitatorId,
          moduleId: dto.moduleId,
          cohortId: dto.cohortId,
          learnerId: dto.learnerId,
        },
      },
    });

    return assignment;
  }

  async listFacilitatorAssignments(programmeId: string, user?: AuthUser) {
    const organisationId = requireOrganisationId(user);
    const programme = await this.prisma.programme.findFirst({
      where: {
        id: programmeId,
        deletedAt: null,
        organisationId,
        ...programmeActorWhere(user),
      },
      select: { id: true },
    });
    if (!programme) throw new NotFoundException('Programme not found');

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
        module: { select: { id: true, code: true, title: true } },
        cohort: { select: { id: true, name: true } },
        learner: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });
  }

  async removeFacilitatorAssignment(assignmentId: string, user?: AuthUser) {
    const organisationId = requireOrganisationId(user);
    const existing = await this.prisma.facilitatorAssignment.findFirst({
      where: { id: assignmentId, organisationId, deletedAt: null },
    });
    if (!existing) throw new NotFoundException('Assignment not found');

    const updated = await this.prisma.facilitatorAssignment.update({
      where: { id: assignmentId },
      data: { deletedAt: new Date(), isActive: false },
    });

    await this.prisma.auditLog.create({
      data: {
        organisationId,
        actorId: user?.userId,
        action: 'FACILITATOR_ASSIGNMENT_REMOVED',
        entityType: 'FacilitatorAssignment',
        entityId: assignmentId,
        beforeValue: {
          programmeId: existing.programmeId,
          facilitatorId: existing.facilitatorId,
        },
      },
    });

    return updated;
  }

  async listCohorts(programmeId: string, user?: AuthUser) {
    const organisationId = requireOrganisationId(user);
    const programme = await this.prisma.programme.findFirst({
      where: {
        id: programmeId,
        organisationId,
        deletedAt: null,
        ...programmeActorWhere(user),
      },
      select: { id: true },
    });
    if (!programme) throw new NotFoundException('Programme not found');

    return this.prisma.cohort.findMany({
      where: {
        programmeId,
        organisationId,
        deletedAt: null,
      },
      include: {
        _count: {
          select: {
            enrollments: { where: { deletedAt: null } },
            facilitatorAssignments: { where: { deletedAt: null, isActive: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createCohort(
    programmeId: string,
    dto: CreateCohortDto,
    user?: AuthUser,
  ) {
    const organisationId = requireOrganisationId(user);
    const programme = await this.prisma.programme.findFirst({
      where: {
        id: programmeId,
        organisationId,
        deletedAt: null,
      },
    });
    if (!programme) throw new NotFoundException('Programme not found');

    return this.prisma.cohort.create({
      data: {
        name: dto.name.trim(),
        programmeId,
        organisationId,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      },
    });
  }

  async updateCohort(
    cohortId: string,
    dto: UpdateCohortDto,
    user?: AuthUser,
  ) {
    const organisationId = requireOrganisationId(user);
    const existing = await this.prisma.cohort.findFirst({
      where: { id: cohortId, organisationId, deletedAt: null },
    });
    if (!existing) throw new NotFoundException('Cohort not found');

    return this.prisma.cohort.update({
      where: { id: cohortId },
      data: {
        name: dto.name ? dto.name.trim() : undefined,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      },
    });
  }

  async deleteCohort(cohortId: string, user?: AuthUser) {
    const organisationId = requireOrganisationId(user);
    const existing = await this.prisma.cohort.findFirst({
      where: { id: cohortId, organisationId, deletedAt: null },
    });
    if (!existing) throw new NotFoundException('Cohort not found');

    return this.prisma.cohort.update({
      where: { id: cohortId },
      data: { deletedAt: new Date() },
    });
  }
}
