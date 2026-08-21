import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDocumentDto } from './documents.dto';
import type { AuthUser } from '../common/types/request-with-user';
import {
  assertEnrollmentAccess,
  enrollmentOrgWhere,
  isLearnerOnly,
  requireOrganisationId,
} from '../common/tenant/tenant-scope';

@Injectable()
export class DocumentsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(user?: AuthUser, enrollmentId?: string) {
    const organisationId = requireOrganisationId(user);
    if (enrollmentId) {
      const enrollment = await this.prisma.enrollment.findFirst({
        where: {
          id: enrollmentId,
          deletedAt: null,
          ...enrollmentOrgWhere(organisationId),
        },
        select: { learnerId: true },
      });
      assertEnrollmentAccess(user, enrollment, 'Document');
    }

    return this.prisma.document.findMany({
      where: {
        deletedAt: null,
        organisationId,
        ...(enrollmentId ? { enrollmentId } : {}),
        ...(isLearnerOnly(user)
          ? {
              enrollment: { learnerId: user!.userId },
            }
          : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(dto: CreateDocumentDto, user?: AuthUser) {
    const organisationId = requireOrganisationId(user);
    if (dto.enrollmentId) {
      const enrollment = await this.prisma.enrollment.findFirst({
        where: {
          id: dto.enrollmentId,
          deletedAt: null,
          ...enrollmentOrgWhere(organisationId),
        },
        select: { learnerId: true },
      });
      if (!enrollment) throw new NotFoundException('Enrollment not found');
      assertEnrollmentAccess(user, enrollment, 'Document');
    } else if (isLearnerOnly(user)) {
      throw new ForbiddenException(
        'Learners must attach documents to their enrolment',
      );
    }

    return this.prisma.document.create({
      data: {
        ...dto,
        organisationId: dto.organisationId ?? organisationId,
      },
    });
  }
}
