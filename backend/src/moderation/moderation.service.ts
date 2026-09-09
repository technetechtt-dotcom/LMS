import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AllocateModeratorDto, CreateModerationDto } from './moderation.dto';
import type { AuthUser } from '../common/types/request-with-user';
import {
  assertAllocatedModerator,
  canModerateSubmission,
  enrollmentOrgWhere,
  isPlatformAdmin,
  requireOrganisationId,
} from '../common/tenant/tenant-scope';

@Injectable()
export class ModerationService {
  constructor(private readonly prisma: PrismaService) {}

  list(user?: AuthUser) {
    const organisationId = requireOrganisationId(user);
    const privileged =
      isPlatformAdmin(user) || Boolean(user?.roleCodes?.includes('ADMIN'));
    return this.prisma.moderation.findMany({
      where: {
        deletedAt: null,
        ...(!privileged && user?.userId ? { moderatorId: user.userId } : {}),
        assessment: {
          deletedAt: null,
          enrollment: enrollmentOrgWhere(organisationId),
        },
      },
      include: { assessment: true },
      orderBy: { moderatedAt: 'desc' },
      take: 200,
    });
  }

  async create(dto: CreateModerationDto, user?: AuthUser) {
    const organisationId = requireOrganisationId(user);
    const moderatorId = user?.userId;
    if (!moderatorId) throw new ForbiddenException('Authentication required');

    const assessment = await this.prisma.assessment.findFirst({
      where: {
        id: dto.assessmentId,
        deletedAt: null,
        enrollment: enrollmentOrgWhere(organisationId),
      },
      select: {
        id: true,
        result: true,
        moderatorId: true,
        submissions: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { status: true },
        },
      },
    });
    if (!assessment) {
      throw new NotFoundException('Assessment not found in organisation');
    }
    if (!canModerateSubmission(user)) {
      throw new ForbiddenException('Only moderators may record a decision');
    }
    assertAllocatedModerator(user, assessment.moderatorId);
    if (assessment.submissions[0]?.status !== 'assessor_verified') {
      throw new BadRequestException(
        'Moderation requires an assessor-verified submission',
      );
    }
    if (!['C', 'NYC'].includes(assessment.result)) {
      throw new BadRequestException(
        'Assessor must finalise C/NYC competency before moderation',
      );
    }

    const latest = await this.prisma.moderation.findFirst({
      where: { assessmentId: dto.assessmentId, deletedAt: null },
      orderBy: { round: 'desc' },
    });
    const decisionData = {
      decision: dto.decision,
      feedback: dto.feedback,
      moderatedAt: new Date(),
      sampledRecords: dto.sampledRecordIds ?? [],
      trail: [
        ...(Array.isArray(latest?.trail) ? (latest.trail as unknown[]) : []),
        {
          action: 'decision_recorded',
          decision: dto.decision,
          at: new Date().toISOString(),
          by: moderatorId,
        },
      ] as object,
    };
    if (latest?.decision === 'PENDING' && latest.moderatorId === moderatorId) {
      return this.prisma.moderation.update({
        where: { id: latest.id },
        data: decisionData,
      });
    }
    return this.prisma.moderation.create({
      data: {
        assessmentId: dto.assessmentId,
        round: (latest?.round ?? 0) + 1,
        moderatorId: assessment.moderatorId!,
        submittedVersion: 1,
        previousOutcome: latest?.decision,
        supersedesId: latest?.id,
        ...decisionData,
      },
    });
  }

  async allocate(dto: AllocateModeratorDto, user?: AuthUser) {
    const organisationId = requireOrganisationId(user);
    if (!user?.userId) throw new ForbiddenException('Authentication required');

    const assessment = await this.prisma.assessment.findFirst({
      where: {
        id: dto.assessmentId,
        deletedAt: null,
        enrollment: enrollmentOrgWhere(organisationId),
      },
      select: { id: true },
    });
    if (!assessment) {
      throw new NotFoundException('Assessment not found in organisation');
    }

    const moderator = await this.prisma.userOrganisation.findFirst({
      where: {
        userId: dto.moderatorId,
        organisationId,
        deletedAt: null,
        role: { code: { in: ['MODERATOR', 'ADMIN', 'QA_OFFICER'] } },
      },
    });
    if (!moderator) {
      throw new BadRequestException(
        'moderatorId must be an active MODERATOR/QA_OFFICER in this organisation',
      );
    }

    const trailEntry = {
      action: 'allocated',
      moderatorId: dto.moderatorId,
      at: new Date().toISOString(),
      by: user.userId,
    };

    const existing = await this.prisma.moderation.findFirst({
      where: { assessmentId: dto.assessmentId, deletedAt: null },
      orderBy: { round: 'desc' },
    });
    const priorTrail = Array.isArray(existing?.trail)
      ? (existing!.trail as unknown[])
      : [];

    const [moderation] = await this.prisma.$transaction([
      this.prisma.moderation.create({
        data: {
          assessmentId: dto.assessmentId,
          round: (existing?.round ?? 0) + 1,
          moderatorId: dto.moderatorId,
          decision: 'PENDING',
          feedback: 'Awaiting moderation',
          previousOutcome: existing?.decision,
          supersedesId: existing?.id,
          trail: [...priorTrail, trailEntry] as object,
        },
      }),
      this.prisma.assessment.update({
        where: { id: dto.assessmentId },
        data: { moderatorId: dto.moderatorId },
      }),
    ]);
    return moderation;
  }

  async history(assessmentId: string, user?: AuthUser) {
    const organisationId = requireOrganisationId(user);
    const assessment = await this.prisma.assessment.findFirst({
      where: {
        id: assessmentId,
        deletedAt: null,
        enrollment: enrollmentOrgWhere(organisationId),
      },
      select: { id: true },
    });
    if (!assessment) throw new NotFoundException('Assessment not found');

    const rounds = await this.prisma.moderation.findMany({
      where: { assessmentId, deletedAt: null },
      include: {
        assessment: {
          select: {
            id: true,
            unitStandard: { select: { title: true } },
          },
        },
      },
      orderBy: { round: 'asc' },
    });
    return {
      assessmentId,
      moderation: rounds[rounds.length - 1] ?? null,
      rounds,
      trail: rounds.flatMap((round) => Array.isArray(round.trail) ? round.trail : []),
    };
  }
}
