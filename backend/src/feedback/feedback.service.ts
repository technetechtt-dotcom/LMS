import { BadRequestException, Injectable } from '@nestjs/common';
import type { AuthUser } from '../common/types/request-with-user';
import { requireOrganisationId } from '../common/tenant/tenant-scope';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FeedbackService {
  constructor(private readonly prisma: PrismaService) {}

  create(
    body: { category?: string; rating?: number; message?: string },
    user?: AuthUser,
  ) {
    const organisationId = requireOrganisationId(user);
    if (!user?.userId || !body.message?.trim()) {
      throw new BadRequestException('Feedback message is required');
    }
    const category = body.category?.trim().toLowerCase() || 'general';
    if (!['general', 'bug', 'feature'].includes(category)) {
      throw new BadRequestException('Invalid feedback category');
    }
    if (body.rating != null && (!Number.isInteger(body.rating) || body.rating < 1 || body.rating > 5)) {
      throw new BadRequestException('Rating must be an integer from 1 to 5');
    }
    return this.prisma.feedback.create({
      data: {
        organisationId,
        submittedById: user.userId,
        category,
        rating: body.rating,
        message: body.message.trim().slice(0, 4000),
      },
      select: { id: true, status: true, createdAt: true },
    });
  }

  list(user?: AuthUser) {
    const organisationId = requireOrganisationId(user);
    return this.prisma.feedback.findMany({
      where: { organisationId },
      include: { submittedBy: { select: { firstName: true, lastName: true, email: true } } },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }
}
