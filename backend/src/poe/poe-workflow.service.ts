import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  PoeLearningArtifactKind,
  PoeLearningArtifactStatus,
  PoeModerationOutcome,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthUser } from '../common/types/request-with-user';
import {
  assertEnrollmentAccess,
  enrollmentOrgWhere,
  isLearnerOnly,
  requireOrganisationId,
} from '../common/tenant/tenant-scope';

export type PoeTransitionAction =
  | 'issue'
  | 'submit'
  | 'facilitator_mark'
  | 'allocate_assessor'
  | 'assessor_mark'
  | 'submit_moderation'
  | 'moderate_approve'
  | 'moderate_reject';

const TRANSITIONS: Record<
  PoeTransitionAction,
  {
    from: PoeLearningArtifactStatus[];
    to: PoeLearningArtifactStatus;
    roles: string[];
  }
> = {
  issue: {
    from: ['DRAFT'],
    to: 'ISSUED_TO_LEARNER',
    roles: ['ADMIN', 'FACILITATOR'],
  },
  submit: {
    from: ['ISSUED_TO_LEARNER'],
    to: 'LEARNER_SUBMITTED',
    roles: ['LEARNER', 'ADMIN', 'FACILITATOR'],
  },
  facilitator_mark: {
    from: ['LEARNER_SUBMITTED'],
    to: 'FACILITATOR_MARKED',
    roles: ['ADMIN', 'FACILITATOR'],
  },
  allocate_assessor: {
    from: ['FACILITATOR_MARKED'],
    to: 'ALLOCATED_TO_ASSESSOR',
    roles: ['ADMIN', 'FACILITATOR'],
  },
  assessor_mark: {
    from: ['ALLOCATED_TO_ASSESSOR'],
    to: 'ASSESSOR_SATISFACTORY',
    roles: ['ADMIN', 'ASSESSOR'],
  },
  submit_moderation: {
    from: ['ASSESSOR_SATISFACTORY'],
    to: 'SUBMITTED_TO_MODERATOR',
    roles: ['ADMIN', 'ASSESSOR'],
  },
  moderate_approve: {
    from: ['SUBMITTED_TO_MODERATOR'],
    to: 'MODERATION_COMPLETE',
    roles: ['ADMIN', 'MODERATOR'],
  },
  moderate_reject: {
    from: ['SUBMITTED_TO_MODERATOR'],
    to: 'MODERATION_COMPLETE',
    roles: ['ADMIN', 'MODERATOR'],
  },
};

@Injectable()
export class PoeWorkflowService {
  constructor(private readonly prisma: PrismaService) {}

  private assertRole(user: AuthUser | undefined, roles: string[]) {
    const codes = user?.roleCodes ?? [];
    if (!roles.some((r) => codes.includes(r))) {
      throw new ForbiddenException('Insufficient role for this PoE transition');
    }
  }

  async create(
    body: {
      enrollmentId: string;
      kind: PoeLearningArtifactKind;
      title: string;
      description?: string;
    },
    user?: AuthUser,
  ) {
    const organisationId = requireOrganisationId(user);
    this.assertRole(user, ['ADMIN', 'FACILITATOR']);
    const enrollment = await this.prisma.enrollment.findFirst({
      where: {
        id: body.enrollmentId,
        deletedAt: null,
        ...enrollmentOrgWhere(organisationId),
      },
      select: { id: true, learnerId: true },
    });
    if (!enrollment) throw new NotFoundException('Enrollment not found');

    return this.prisma.poeLearningArtifact.create({
      data: {
        enrollmentId: body.enrollmentId,
        kind: body.kind,
        title: body.title,
        description: body.description,
        status: 'DRAFT',
        createdById: user!.userId,
      },
    });
  }

  async list(enrollmentId: string, user?: AuthUser) {
    const organisationId = requireOrganisationId(user);
    const enrollment = await this.prisma.enrollment.findFirst({
      where: {
        id: enrollmentId,
        deletedAt: null,
        ...enrollmentOrgWhere(organisationId),
      },
      select: { learnerId: true },
    });
    assertEnrollmentAccess(user, enrollment, 'PoE artifact');

    return this.prisma.poeLearningArtifact.findMany({
      where: { enrollmentId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  async transition(
    id: string,
    action: PoeTransitionAction,
    body: { feedback?: string; assessorId?: string; moderatorId?: string },
    user?: AuthUser,
  ) {
    const organisationId = requireOrganisationId(user);
    const rule = TRANSITIONS[action];
    if (!rule) throw new BadRequestException(`Unknown action: ${action}`);
    this.assertRole(user, rule.roles);

    const artifact = await this.prisma.poeLearningArtifact.findFirst({
      where: {
        id,
        deletedAt: null,
        enrollment: enrollmentOrgWhere(organisationId),
      },
      include: { enrollment: { select: { learnerId: true } } },
    });
    if (!artifact) throw new NotFoundException('PoE artifact not found');

    if (isLearnerOnly(user) && action === 'submit') {
      assertEnrollmentAccess(user, artifact.enrollment, 'PoE artifact');
    }

    if (!rule.from.includes(artifact.status)) {
      throw new BadRequestException(
        `Cannot ${action} from status ${artifact.status}`,
      );
    }

    const now = new Date();
    const data: Record<string, unknown> = {
      status: rule.to,
    };

    switch (action) {
      case 'facilitator_mark':
        data.facilitatorMarkedAt = now;
        data.facilitatorMarkedById = user!.userId;
        data.facilitatorFeedback = body.feedback;
        break;
      case 'allocate_assessor':
        data.allocatedToAssessorAt = now;
        data.assessorId = body.assessorId ?? user!.userId;
        break;
      case 'assessor_mark':
        data.assessorMarkedAt = now;
        data.assessorId = user!.userId;
        data.assessorFeedback = body.feedback;
        break;
      case 'submit_moderation':
        data.submittedToModeratorAt = now;
        data.submittedForModerationById = user!.userId;
        data.moderatorId = body.moderatorId;
        break;
      case 'moderate_approve':
        data.moderatedAt = now;
        data.moderatorId = user!.userId;
        data.moderatorFeedback = body.feedback;
        data.moderationOutcome = PoeModerationOutcome.APPROVED;
        break;
      case 'moderate_reject':
        data.moderatedAt = now;
        data.moderatorId = user!.userId;
        data.moderatorFeedback = body.feedback;
        data.moderationOutcome = PoeModerationOutcome.REJECTED;
        break;
      default:
        break;
    }

    const updated = await this.prisma.poeLearningArtifact.update({
      where: { id },
      data,
    });

    await this.prisma.auditLog.create({
      data: {
        organisationId,
        actorId: user!.userId,
        entityType: 'PoeLearningArtifact',
        entityId: id,
        action: `POE_${action.toUpperCase()}`,
        beforeValue: { status: artifact.status },
        afterValue: { status: updated.status, action },
      },
    });

    return updated;
  }

  /** Completeness gate for certificates. */
  async enrollmentReadyForCertificate(enrollmentId: string): Promise<{
    ready: boolean;
    reasons: string[];
  }> {
    const enrollment = await this.prisma.enrollment.findFirst({
      where: { id: enrollmentId, deletedAt: null },
    });
    if (!enrollment) return { ready: false, reasons: ['Enrollment not found'] };

    const reasons: string[] = [];

    if (enrollment.status !== 'COMPLETED') {
      reasons.push('Enrolment lifecycle is not COMPLETED');
    }

    const assessments = await this.prisma.assessment.findMany({
      where: { enrollmentId, deletedAt: null },
    });
    if (!assessments.length) {
      reasons.push('No competency assessments recorded');
    } else if (assessments.some((a) => a.result !== 'C')) {
      reasons.push('Not all assessments are Competent (C)');
    }

    const artifacts = await this.prisma.poeLearningArtifact.findMany({
      where: {
        enrollmentId,
        deletedAt: null,
        kind: { in: ['WORKBOOK', 'SUMMATIVE'] },
      },
    });
    if (!artifacts.length) {
      reasons.push('Missing workbook/summative PoE artifacts');
    } else {
      const incomplete = artifacts.filter(
        (a) =>
          a.status !== 'MODERATION_COMPLETE' ||
          a.moderationOutcome !== 'APPROVED',
      );
      if (incomplete.length) {
        reasons.push('PoE artifacts not fully moderated and approved');
      }
    }

    return { ready: reasons.length === 0, reasons };
  }
}
