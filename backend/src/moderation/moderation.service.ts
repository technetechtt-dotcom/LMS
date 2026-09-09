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

    return this.prisma.moderation.create({
      data: {
        assessmentId: dto.assessmentId,
        moderatorId: assessment.moderatorId!,
        decision: dto.decision,
        feedback: dto.feedback,
        trail: [
          {
            action: 'decision_recorded',
            decision: dto.decision,
            at: new Date().toISOString(),
            by: moderatorId,
          },
        ],
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

    const existing = await this.prisma.moderation.findUnique({
      where: { assessmentId: dto.assessmentId },
    });
    const priorTrail = Array.isArray(existing?.trail)
      ? (existing!.trail as unknown[])
      : [];

    const [moderation] = await this.prisma.$transaction([
      this.prisma.moderation.upsert({
        where: { assessmentId: dto.assessmentId },
        create: {
          assessmentId: dto.assessmentId,
          moderatorId: dto.moderatorId,
          decision: 'PENDING',
          feedback: 'Awaiting moderation',
          trail: [trailEntry],
        },
        update: {
          moderatorId: dto.moderatorId,
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

    const moderation = await this.prisma.moderation.findFirst({
      where: { assessmentId, deletedAt: null },
      include: {
        assessment: {
          select: {
            id: true,
            unitStandard: { select: { title: true } },
          },
        },
      },
    });
    return {
      assessmentId,
      moderation,
      trail: Array.isArray(moderation?.trail) ? moderation.trail : [],
    };
  }
}
