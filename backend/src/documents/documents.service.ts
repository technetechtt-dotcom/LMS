import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FileStorageService } from '../common/file-storage.service';
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
  constructor(
    private readonly prisma: PrismaService,
    private readonly files: FileStorageService,
  ) {}

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

    const locator = this.files.storageLocator(dto.storageKey);
    return this.prisma.document.create({
      data: {
        enrollmentId: dto.enrollmentId,
        category: dto.category,
        name: dto.name,
        storageKey: dto.storageKey,
        url: locator,
        organisationId,
      },
    });
  }

  async getDownloadUrl(id: string, user?: AuthUser) {
    const organisationId = requireOrganisationId(user);
    const doc = await this.prisma.document.findFirst({
      where: {
        id,
        deletedAt: null,
        organisationId,
        ...(isLearnerOnly(user)
          ? { enrollment: { learnerId: user!.userId } }
          : {}),
      },
      include: { enrollment: { select: { learnerId: true } } },
    });
    if (!doc) throw new NotFoundException('Document not found');
    if (doc.enrollment) {
      assertEnrollmentAccess(user, doc.enrollment, 'Document');
    }
    const downloadUrl = await this.files.getSignedDownloadUrl(
      doc.storageKey,
      900,
    );
    return {
      id: doc.id,
      storageKey: doc.storageKey,
      downloadUrl,
      expiresInSeconds: 900,
    };
  }
}
