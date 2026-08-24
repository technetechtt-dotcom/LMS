import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateModerationDto } from './moderation.dto';
import type { AuthUser } from '../common/types/request-with-user';
import {
  enrollmentOrgWhere,
  requireOrganisationId,
} from '../common/tenant/tenant-scope';

@Injectable()
export class ModerationService {
  constructor(private readonly prisma: PrismaService) {}

  list(user?: AuthUser) {
    const organisationId = requireOrganisationId(user);
    return this.prisma.moderation.findMany({
      where: {
        deletedAt: null,
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
      select: { id: true },
    });
    if (!assessment) {
      throw new NotFoundException('Assessment not found in organisation');
    }

    return this.prisma.moderation.create({
      data: {
        assessmentId: dto.assessmentId,
        moderatorId,
        decision: dto.decision,
        feedback: dto.feedback,
      },
    });
  }
}
