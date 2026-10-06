import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEnrollmentDto, TransitionEnrollmentDto } from './enrollments.dto';
import type { AuthUser } from '../common/types/request-with-user';
import {
  assertEnrollmentAccess,
  enrollmentActorWhere,
  enrollmentOrgWhere,
  isFacilitatorOnly,
  isLearnerOnly,
  requireOrganisationId,
} from '../common/tenant/tenant-scope';
import { resolveEnrollmentTransition } from './enrollment-lifecycle';
import { CompletionGateService } from './completion-gate.service';

@Injectable()
export class EnrollmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly completion: CompletionGateService,
  ) {}

  async list(user?: AuthUser) {
    const organisationId = requireOrganisationId(user);
    return this.prisma.enrollment.findMany({
      where: {
        deletedAt: null,
        ...enrollmentOrgWhere(organisationId),
        ...enrollmentActorWhere(user),
      },
      include: {
        learner: true,
        programme: true,
        employerOrganisation: true,
        cohort: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(dto: CreateEnrollmentDto, user?: AuthUser) {
    const organisationId = requireOrganisationId(user);
    const programme = await this.prisma.programme.findFirst({
      where: { id: dto.programmeId, deletedAt: null, organisationId },
      include: {
        facilitatorAssignments: {
          where: { deletedAt: null, isActive: true },
        },
      },
    });
    if (!programme) {
      throw new NotFoundException('Programme not found in your organisation');
    }

    if (isFacilitatorOnly(user)) {
      const assigned = programme.facilitatorAssignments.some(
        (fa) => fa.facilitatorId === user?.userId && fa.isActive,
      );
      if (!assigned) {
        throw new ForbiddenException(
          'Facilitators cannot create enrolments outside their assigned programmes',
        );
      }
    }

    const learner = await this.prisma.user.findFirst({
      where: { id: dto.learnerId, deletedAt: null },
      select: { id: true },
    });
    if (!learner) throw new NotFoundException('Learner user not found');

    if (dto.employerOrganisationId) {
      const employer = await this.prisma.organisation.findFirst({
        where: { id: dto.employerOrganisationId, deletedAt: null },
        select: { id: true },
      });
      if (!employer) throw new BadRequestException('Employer organisation invalid');
    }

    return this.prisma.enrollment.create({
      data: {
        learnerId: dto.learnerId,
        programmeId: dto.programmeId,
        cohortId: dto.cohortId,
        sdioOrganisationId: organisationId,
        employerOrganisationId: dto.employerOrganisationId,
        status: 'ENROLLED',
      },
    });
  }

  async softDelete(id: string, user?: AuthUser) {
    const organisationId = requireOrganisationId(user);
    const row = await this.prisma.enrollment.findFirst({
      where: { id, deletedAt: null, ...enrollmentOrgWhere(organisationId) },
    });
    if (!row) throw new NotFoundException('Enrollment not found');
    return this.prisma.enrollment.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async transition(
    id: string,
    dto: TransitionEnrollmentDto,
    changedById: string,
    user?: AuthUser,
  ) {
    if (isLearnerOnly(user)) {
      throw new ForbiddenException('Learners cannot transition enrolments');
    }
    const organisationId = requireOrganisationId(user);
    const enrollment = await this.prisma.enrollment.findFirst({
      where: {
        id,
        deletedAt: null,
        ...enrollmentOrgWhere(organisationId),
        ...enrollmentActorWhere(user),
      },
      include: {
        programme: {
          include: {
            facilitatorAssignments: {
              where: { deletedAt: null, isActive: true },
            },
          },
        },
      },
    });
    if (!enrollment) throw new NotFoundException('Enrollment not found');
    assertEnrollmentAccess(user, enrollment, 'Enrollment');

    const toState = resolveEnrollmentTransition(
      enrollment.status,
      dto.action,
      dto.toState,
    );

    if (dto.action === 'COMPLETE_ENROLLMENT') {
      const gate = await this.completion.evaluate(id, organisationId);
      if (!gate.ready) {
        throw new BadRequestException({
          message: 'Enrolment does not meet programme completion requirements',
          reasons: gate.reasons,
          checks: gate.checks,
        });
      }
    }

    const now = new Date();
    const statusData: {
      status: typeof toState;
      startedAt?: Date;
      completedAt?: Date | null;
    } = { status: toState };
    if (toState === 'TRAINING' && !enrollment.startedAt) {
      statusData.startedAt = now;
    }
    if (toState === 'COMPLETED') {
      statusData.completedAt = now;
    }
    if (toState === 'ENROLLED' && dto.action === 'REOPEN') {
      statusData.completedAt = null;
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.enrollment.update({
        where: { id },
        data: statusData,
      });

      await tx.enrollmentWorkflow.create({
        data: {
          enrollmentId: id,
          fromState: enrollment.status,
          toState,
          action: dto.action,
          reason: dto.reason,
          changedById,
          changedAt: dto.changedAt ? new Date(dto.changedAt) : undefined,
        },
      });

      return updated;
    });
  }

  async completionStatus(id: string, user?: AuthUser) {
    const organisationId = requireOrganisationId(user);
    const enrollment = await this.prisma.enrollment.findFirst({
      where: {
        id,
        deletedAt: null,
        ...enrollmentOrgWhere(organisationId),
        ...enrollmentActorWhere(user),
      },
      include: {
        programme: {
          include: {
            facilitatorAssignments: {
              where: { deletedAt: null, isActive: true },
            },
          },
        },
      },
    });
    if (!enrollment) throw new NotFoundException('Enrollment not found');
    assertEnrollmentAccess(user, enrollment, 'Enrollment');
    return this.completion.evaluate(id, organisationId);
  }
}
