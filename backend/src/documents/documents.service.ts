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
  enrollmentActorWhere,
  enrollmentOrgWhere,
  isLearnerOnly,
  isMentorOnly,
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
    const actorScope = enrollmentActorWhere(user);
    if (enrollmentId) {
      const enrollment = await this.prisma.enrollment.findFirst({
        where: {
          id: enrollmentId,
          deletedAt: null,
          ...enrollmentOrgWhere(organisationId),
        },
        select: { learnerId: true, metadata: true },
      });
      assertEnrollmentAccess(user, enrollment, 'Document');
    }

    return this.prisma.document.findMany({
      where: {
        deletedAt: null,
        organisationId,
        ...(enrollmentId ? { enrollmentId } : {}),
        ...(Object.keys(actorScope).length ? { enrollment: actorScope } : {}),
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
        select: { learnerId: true, metadata: true },
      });
      if (!enrollment) throw new NotFoundException('Enrollment not found');
      assertEnrollmentAccess(user, enrollment, 'Document');
    } else if (isLearnerOnly(user)) {
      throw new ForbiddenException(
        'Learners must attach documents to their enrolment',
      );
    }

    const key = await this.files.assertValidStorageKey(
      dto.storageKey,
      organisationId,
    );
    const locator = this.files.storageLocator(key);
    return this.prisma.document.create({
      data: {
        enrollmentId: dto.enrollmentId,
        category: dto.category,
        name: dto.name,
        storageKey: key,
        url: locator,
        organisationId,
      },
    });
  }

  async getDownloadUrl(id: string, user?: AuthUser) {
    const organisationId = requireOrganisationId(user);
    const actorScope = enrollmentActorWhere(user);
    const doc = await this.prisma.document.findFirst({
      where: {
        id,
        deletedAt: null,
        organisationId,
        ...(Object.keys(actorScope).length ? { enrollment: actorScope } : {}),
      },
      include: { enrollment: { select: { learnerId: true, metadata: true } } },
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
