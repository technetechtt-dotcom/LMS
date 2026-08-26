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
import { CompletionGateService } from '../enrollments/completion-gate.service';

export type PoeTransitionAction =
  | 'issue'
  | 'submit'
  | 'facilitator_mark'
  | 'allocate_assessor'
  | 'assessor_mark'
  | 'submit_moderation'
  | 'moderate_approve'
  | 'moderate_reject';

/** Exported for tests — keep in sync with PoeWorkflowService behaviour. */
export const POE_TRANSITIONS: Record<
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
  constructor(
    private readonly prisma: PrismaService,
    private readonly completion: CompletionGateService,
  ) {}

  private assertRole(user: AuthUser | undefined, roles: string[]) {
    const codes = user?.roleCodes ?? [];
    if (!roles.some((r) => codes.includes(r))) {
      throw new ForbiddenException('Insufficient role for this PoE transition');
    }
  }

  private async assertOrgMemberWithRole(
    organisationId: string,
    userId: string,
    roleCodes: string[],
  ) {
    const membership = await this.prisma.userOrganisation.findFirst({
      where: {
        userId,
        organisationId,
        deletedAt: null,
        user: { deletedAt: null, isActive: true },
        role: { code: { in: roleCodes }, deletedAt: null },
      },
      include: { role: true },
    });
    if (!membership) {
      throw new BadRequestException(
        `User must be an active ${roleCodes.join('/')} in this organisation`,
      );
    }
    return membership;
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
    const rule = POE_TRANSITIONS[action];
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

    const codes = user?.roleCodes ?? [];
    const isAdmin = codes.includes('ADMIN') || codes.includes('PLATFORM_ADMIN');

    if (action === 'assessor_mark' && !isAdmin) {
      if (!artifact.assessorId || artifact.assessorId !== user!.userId) {
        throw new ForbiddenException(
          'Only the allocated assessor may mark this artefact',
        );
      }
    }
    if (
      (action === 'moderate_approve' || action === 'moderate_reject') &&
      !isAdmin
    ) {
      if (!artifact.moderatorId || artifact.moderatorId !== user!.userId) {
        throw new ForbiddenException(
          'Only the allocated moderator may moderate this artefact',
        );
      }
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
      case 'allocate_assessor': {
        const assessorId = body.assessorId;
        if (!assessorId) {
          throw new BadRequestException('assessorId is required');
        }
        await this.assertOrgMemberWithRole(organisationId, assessorId, [
          'ASSESSOR',
          'ADMIN',
        ]);
        data.allocatedToAssessorAt = now;
        data.assessorId = assessorId;
        break;
      }
      case 'assessor_mark':
        data.assessorMarkedAt = now;
        data.assessorFeedback = body.feedback;
        break;
      case 'submit_moderation': {
        const moderatorId = body.moderatorId;
        if (!moderatorId) {
          throw new BadRequestException('moderatorId is required');
        }
        await this.assertOrgMemberWithRole(organisationId, moderatorId, [
          'MODERATOR',
          'ADMIN',
        ]);
        data.submittedToModeratorAt = now;
        data.submittedForModerationById = user!.userId;
        data.moderatorId = moderatorId;
        break;
      }
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

  /** Certificate gate: lifecycle COMPLETED + programme completion requirements. */
  async enrollmentReadyForCertificate(enrollmentId: string): Promise<{
    ready: boolean;
    reasons: string[];
  }> {
    const enrollment = await this.prisma.enrollment.findFirst({
      where: { id: enrollmentId, deletedAt: null },
      select: {
        id: true,
        status: true,
        sdioOrganisationId: true,
      },
    });
    if (!enrollment) return { ready: false, reasons: ['Enrollment not found'] };

    const reasons: string[] = [];
    if (enrollment.status !== 'COMPLETED') {
      reasons.push('Enrolment lifecycle is not COMPLETED');
    }

    const gate = await this.completion.evaluate(
      enrollmentId,
      enrollment.sdioOrganisationId,
    );
    reasons.push(...gate.reasons);

    return { ready: reasons.length === 0, reasons };
  }
}
