import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { LearnersService } from '../learners/learners.service';
import type { AuthUser } from '../common/types/request-with-user';
import {
  enrollmentOrgWhere,
  requireOrganisationId,
} from '../common/tenant/tenant-scope';
import {
  ArrangePlacementDto,
  BulkImportLearnersDto,
  QaContractType,
  RecordVettingDto,
  RegisterContractDto,
  SignContractDto,
} from './qa-officer.dto';

const CONTRACT_CATEGORY: Record<QaContractType, string> = {
  [QaContractType.SETA]: 'qa-contract-seta',
  [QaContractType.SDP]: 'qa-contract-sdp',
  [QaContractType.IMPLEMENTATION]: 'qa-contract-implementation',
};

function enrollmentMeta(raw: unknown): Record<string, unknown> {
  return (raw as Record<string, unknown> | null) ?? {};
}

@Injectable()
export class QaOfficerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly learners: LearnersService,
  ) {}

  async overview(user?: AuthUser) {
    const organisationId = requireOrganisationId(user);
    const orgWhere = enrollmentOrgWhere(organisationId);

    const [contracts, enrollments] = await Promise.all([
      this.prisma.document.findMany({
        where: {
          deletedAt: null,
          organisationId,
          category: { startsWith: 'qa-contract-' },
        },
        select: { metadata: true },
      }),
      this.prisma.enrollment.findMany({
        where: { deletedAt: null, ...orgWhere },
        select: {
          id: true,
          metadata: true,
          employerOrganisationId: true,
        },
      }),
    ]);

    const unsignedContracts = contracts.filter((c) => {
      const m = enrollmentMeta(c.metadata);
      return m.status !== 'signed';
    }).length;

    const vettingPending = enrollments.filter((e) => {
      const m = enrollmentMeta(e.metadata);
      const status = m.vettingStatus ?? 'pending';
      return status === 'pending';
    }).length;

    const placementPending = enrollments.filter((e) => {
      const m = enrollmentMeta(e.metadata);
      const vetted = m.vettingStatus === 'qualified';
      const placed =
        Boolean(e.employerOrganisationId) || m.placementStatus === 'placed';
      return vetted && !placed;
    }).length;

    return {
      unsignedContracts,
      vettingPending,
      placementPending,
      totalLearners: enrollments.length,
    };
  }

  async listContracts(user?: AuthUser) {
    const organisationId = requireOrganisationId(user);
    const docs = await this.prisma.document.findMany({
      where: {
        deletedAt: null,
        organisationId,
        category: { startsWith: 'qa-contract-' },
      },
      orderBy: { updatedAt: 'desc' },
    });
    return docs.map((d) => {
      const meta = enrollmentMeta(d.metadata);
      return {
        id: d.id,
        name: d.name,
        contractType: meta.contractType ?? d.category.replace('qa-contract-', '').toUpperCase(),
        counterparty: meta.counterparty,
        status: meta.status ?? 'draft',
        effectiveDate: meta.effectiveDate,
        expiryDate: meta.expiryDate,
        signedAt: meta.signedAt,
        signedById: meta.signedById,
        notes: meta.notes,
        fileUrl: d.url,
        updatedAt: d.updatedAt.toISOString(),
      };
    });
  }

  async registerContract(dto: RegisterContractDto, user?: AuthUser) {
    const organisationId = requireOrganisationId(user);
    if (!user?.userId) throw new BadRequestException('Authentication required');

    const doc = await this.prisma.document.create({
      data: {
        organisationId,
        category: CONTRACT_CATEGORY[dto.contractType],
        name: dto.name,
        storageKey: `qa-contracts/${randomUUID()}`,
        url: '/documents/placeholder',
        metadata: {
          contractType: dto.contractType,
          counterparty: dto.counterparty,
          effectiveDate: dto.effectiveDate,
          expiryDate: dto.expiryDate,
          notes: dto.notes,
          status: 'pending_signature',
          registeredById: user.userId,
          registeredAt: new Date().toISOString(),
        },
      },
    });
    return this.listContracts(user).then((all) =>
      all.find((c) => c.id === doc.id),
    );
  }

  async signContract(id: string, dto: SignContractDto, user?: AuthUser) {
    const organisationId = requireOrganisationId(user);
    if (!user?.userId) throw new BadRequestException('Authentication required');

    const doc = await this.prisma.document.findFirst({
      where: {
        id,
        deletedAt: null,
        organisationId,
        category: { startsWith: 'qa-contract-' },
      },
    });
    if (!doc) throw new NotFoundException('Contract not found');

    const meta = enrollmentMeta(doc.metadata);
    const updated = await this.prisma.document.update({
      where: { id },
      data: {
        verifiedAt: new Date(),
        verifiedById: user.userId,
        metadata: {
          ...meta,
          status: 'signed',
          signedAt: new Date().toISOString(),
          signedById: user.userId,
          signatureNotes: dto.signatureNotes,
        },
      },
    });
    const m = enrollmentMeta(updated.metadata);
    return {
      id: updated.id,
      name: updated.name,
      contractType: m.contractType,
      status: 'signed',
      signedAt: m.signedAt,
    };
  }

  async vettingQueue(user?: AuthUser) {
    const organisationId = requireOrganisationId(user);
    const rows = await this.prisma.enrollment.findMany({
      where: { deletedAt: null, ...enrollmentOrgWhere(organisationId) },
      include: {
        learner: true,
        programme: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });

    return rows
      .filter((e) => {
        const m = enrollmentMeta(e.metadata);
        return (m.vettingStatus ?? 'pending') === 'pending';
      })
      .map((e) => {
        const m = enrollmentMeta(e.metadata);
        return {
          enrollmentId: e.id,
          learnerId: e.learnerId,
          name: `${e.learner.firstName} ${e.learner.lastName}`.trim(),
          email: e.learner.email,
          programme: e.programme.title,
          idNumber: m.idNumber,
          phone: m.phone,
          uploadedAt: e.createdAt.toISOString(),
          vettingChecks: m.vettingChecks ?? {
            idVerified: false,
            popiaConsent: false,
            qualificationMet: false,
            documentsComplete: false,
          },
        };
      });
  }

  async bulkImport(dto: BulkImportLearnersDto, user?: AuthUser) {
    const results: Array<{ email: string; ok: boolean; error?: string }> = [];
    for (const row of dto.learners) {
      try {
        const created = await this.learners.create(
          {
            email: row.email,
            firstName: row.firstName,
            lastName: row.lastName,
            programmeId: row.programmeId,
            idNumber: row.idNumber,
            phone: row.phone,
          },
          user,
        );
        const enrollmentId = String(created.id);
        const enr = await this.prisma.enrollment.findUnique({
          where: { id: enrollmentId },
          select: { metadata: true },
        });
        const prior = enrollmentMeta(enr?.metadata);
        await this.prisma.enrollment.update({
          where: { id: enrollmentId },
          data: {
            metadata: {
              ...prior,
              idNumber: (row.idNumber ?? prior.idNumber) as string | undefined,
              phone: (row.phone ?? prior.phone) as string | undefined,
              vettingStatus: 'pending',
              placementStatus: 'unplaced',
              vettingChecks: {
                idVerified: false,
                popiaConsent: false,
                qualificationMet: false,
                documentsComplete: false,
              },
              uploadedByQaId: user?.userId,
              uploadedAt: new Date().toISOString(),
            } as object,
          },
        });
        results.push({ email: row.email, ok: true });
      } catch (err) {
        results.push({
          email: row.email,
          ok: false,
          error: err instanceof Error ? err.message : 'Import failed',
        });
      }
    }
    return { imported: results.filter((r) => r.ok).length, results };
  }

  async recordVetting(
    enrollmentId: string,
    dto: RecordVettingDto,
    user?: AuthUser,
  ) {
    const organisationId = requireOrganisationId(user);
    if (!user?.userId) throw new BadRequestException('Authentication required');

    const row = await this.prisma.enrollment.findFirst({
      where: {
        id: enrollmentId,
        deletedAt: null,
        ...enrollmentOrgWhere(organisationId),
      },
    });
    if (!row) throw new NotFoundException('Enrollment not found');

    const allPass =
      dto.checks.idVerified &&
      dto.checks.popiaConsent &&
      dto.checks.qualificationMet &&
      dto.checks.documentsComplete;

    if (dto.decision === 'qualified' && !allPass) {
      throw new BadRequestException(
        'All vetting checks must pass before marking qualified',
      );
    }

    const meta = enrollmentMeta(row.metadata);
    const updated = await this.prisma.enrollment.update({
      where: { id: enrollmentId },
      data: {
        metadata: {
          ...meta,
          vettingStatus: dto.decision,
          vettingChecks: { ...dto.checks },
          vettingNotes: dto.notes,
          vettedById: user.userId,
          vettedAt: new Date().toISOString(),
        } as object,
      },
      include: { learner: true, programme: true },
    });
    return {
      enrollmentId: updated.id,
      vettingStatus: dto.decision,
      learnerName: `${updated.learner.firstName} ${updated.learner.lastName}`.trim(),
    };
  }

  async placementQueue(user?: AuthUser) {
    const organisationId = requireOrganisationId(user);
    const rows = await this.prisma.enrollment.findMany({
      where: { deletedAt: null, ...enrollmentOrgWhere(organisationId) },
      include: {
        learner: true,
        programme: true,
        employerOrganisation: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });

    return rows
      .filter((e) => {
        const m = enrollmentMeta(e.metadata);
        const vetted = m.vettingStatus === 'qualified';
        const placed =
          Boolean(e.employerOrganisationId) || m.placementStatus === 'placed';
        return vetted && !placed;
      })
      .map((e) => {
        const m = enrollmentMeta(e.metadata);
        return {
          enrollmentId: e.id,
          learnerId: e.learnerId,
          name: `${e.learner.firstName} ${e.learner.lastName}`.trim(),
          email: e.learner.email,
          programme: e.programme.title,
          vettedAt: m.vettedAt,
        };
      });
  }

  async arrangePlacement(
    enrollmentId: string,
    dto: ArrangePlacementDto,
    user?: AuthUser,
  ) {
    const organisationId = requireOrganisationId(user);
    if (!user?.userId) throw new BadRequestException('Authentication required');

    const row = await this.prisma.enrollment.findFirst({
      where: {
        id: enrollmentId,
        deletedAt: null,
        ...enrollmentOrgWhere(organisationId),
      },
    });
    if (!row) throw new NotFoundException('Enrollment not found');

    const meta = enrollmentMeta(row.metadata);
    if (meta.vettingStatus !== 'qualified') {
      throw new BadRequestException(
        'Learner must pass QA vetting before workplace placement',
      );
    }

    const employer = await this.prisma.organisation.findFirst({
      where: { id: dto.employerOrganisationId, deletedAt: null },
    });
    if (!employer) throw new BadRequestException('Employer organisation not found');

    if (dto.workplaceMentorId) {
      const mentor = await this.prisma.userOrganisation.findFirst({
        where: {
          userId: dto.workplaceMentorId,
          organisationId,
          deletedAt: null,
          role: { code: 'MENTOR' },
        },
      });
      if (!mentor) {
        throw new BadRequestException(
          'workplaceMentorId must be an active Workplace Mentor in this organisation',
        );
      }
    }

    const updated = await this.prisma.enrollment.update({
      where: { id: enrollmentId },
      data: {
        employerOrganisationId: dto.employerOrganisationId,
        status: row.status === 'ENROLLED' ? 'WORKPLACE' : row.status,
        metadata: {
          ...meta,
          placementStatus: 'placed',
          workplaceMentorId: dto.workplaceMentorId,
          placementStartDate: dto.placementStartDate,
          placementNotes: dto.notes,
          arrangedById: user.userId,
          arrangedAt: new Date().toISOString(),
        } as object,
      },
      include: {
        learner: true,
        programme: true,
        employerOrganisation: true,
      },
    });

    return {
      enrollmentId: updated.id,
      employer: updated.employerOrganisation?.name,
      placementStatus: 'placed',
      learnerName: `${updated.learner.firstName} ${updated.learner.lastName}`.trim(),
    };
  }
}
