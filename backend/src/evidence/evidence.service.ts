import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FileStorageService } from '../common/file-storage.service';
import { CreateEvidenceDto } from './evidence.dto';
import type { AuthUser } from '../common/types/request-with-user';
import {
  assertEnrollmentAccess,
  enrollmentActorWhere,
  enrollmentOrgWhere,
  isLearnerOnly,
  requireOrganisationId,
} from '../common/tenant/tenant-scope';
import type { StagedUploadFile } from '../common/quarantine-upload';

@Injectable()
export class EvidenceService {
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
        select: { learnerId: true, metadata: true },
      });
      assertEnrollmentAccess(user, enrollment, 'Evidence');
    }

    return this.prisma.evidence.findMany({
      where: {
        deletedAt: null,
        ...(enrollmentId ? { enrollmentId } : {}),
        enrollment: {
          ...enrollmentOrgWhere(organisationId),
          ...enrollmentActorWhere(user),
        },
      },
      include: { unitStandard: true, outcome: true },
    });
  }

  async create(
    dto: CreateEvidenceDto,
    file: StagedUploadFile | undefined,
    user?: AuthUser,
  ) {
    const organisationId = requireOrganisationId(user);
    const uploadedById = user?.userId;
    if (!uploadedById) throw new NotFoundException('Authentication required');

    const enrollment = await this.prisma.enrollment.findFirst({
      where: {
        id: dto.enrollmentId,
        deletedAt: null,
        ...enrollmentOrgWhere(organisationId),
      },
      select: { id: true, learnerId: true, metadata: true },
    });
    if (!enrollment) throw new NotFoundException('Enrollment not found');
    assertEnrollmentAccess(user, enrollment, 'Evidence');

    if (!file) throw new BadRequestException('An evidence file is required');
    const stored = await this.files.uploadStaged(file, {
      prefix: 'evidence',
      organisationId,
      uploadedById,
    });
    return this.prisma.evidence.create({
      data: {
        ...dto,
        uploadId: stored.uploadId,
        fileName: file.originalname,
        fileType: stored.mimeType,
        fileSize: stored.size,
        storageKey: stored.key,
        url: stored.url,
        metadata: {
          checksum: stored.sha256,
          scanResult: stored.status,
        },
        uploadedById,
      },
    });
  }
}
