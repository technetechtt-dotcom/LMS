import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, LearningMaterial } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { FileStorageService } from '../common/file-storage.service';
import { CreateLearningMaterialDto, ListMaterialsQueryDto } from './materials.dto';
import { AuthUser } from '../common/types/request-with-user';
import {
  ARTIFACT_LABELS,
  defaultPoeComponentForSlug,
  detectModuleFamily,
} from '../common/curriculum/learnership-curriculum';
import { evaluateModuleCompleteness } from '../common/curriculum/module-completeness';

function normalizeSlug(s?: string): string {
  if (!s || s === 'na') return 'other';
  return s;
}

function formatFileSizeBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function mediaKindFromDto(d: CreateLearningMaterialDto, mime?: string): string {
  const t = d.type?.toLowerCase();
  if (t && ['video', 'pdf', 'document', 'interactive', 'audio'].includes(t)) return t;
  if (mime?.includes('video')) return 'video';
  if (mime?.includes('pdf')) return 'pdf';
  return 'pdf';
}

function formatFromDto(d: CreateLearningMaterialDto, mime?: string): string {
  if (d.format?.trim()) return d.format.trim().toUpperCase();
  if (mime?.includes('video')) return 'MP4';
  if (mime?.includes('pdf')) return 'PDF';
  return 'PDF';
}

@Injectable()
export class MaterialsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly files: FileStorageService,
  ) {}

  private requireOrganisationId(user: AuthUser | undefined): string {
    if (!user?.organisationId) {
      throw new BadRequestException('Organisation context is required (x-organisation-id or JWT org)');
    }
    return user.organisationId;
  }

  private toClientRow(
    m: LearningMaterial & {
      programme: { id: string; title: string } | null;
    },
  ) {
    const artifactSlug = m.artifactSlug;
    return {
      id: m.id,
      title: m.title,
      description: m.description ?? undefined,
      programmeId: m.programmeId ?? m.programme?.id ?? undefined,
      programmeName: m.programme?.title ?? 'Unassigned',
      moduleId: m.moduleKey ?? 'm1',
      moduleName: m.moduleLabel ?? 'Module 1',
      type: m.mediaKind,
      format: m.formatLabel,
      fileUrl: m.url,
      fileSize: formatFileSizeBytes(m.fileSizeBytes),
      viewCount: m.viewCount,
      downloadCount: m.downloadCount,
      completionCount: m.completionCount,
      isApproved: m.isApproved,
      isAIEnhanced: m.isAIEnhanced,
      uploadedBy: m.uploadedById,
      moduleCode: m.moduleCode ?? '—',
      artifactSlug,
      artifactType: m.artifactTypeLabel ?? ARTIFACT_LABELS[artifactSlug] ?? '—',
      poeComponent: m.poeComponent,
      createdAt: m.createdAt.toISOString(),
      updatedAt: m.updatedAt.toISOString(),
    };
  }

  private applyFilters(
    rows: (LearningMaterial & { programme: { id: string; title: string } | null })[],
    q: ListMaterialsQueryDto,
  ) {
    let out = rows;
    if (q.search?.trim()) {
      const s = q.search.trim().toLowerCase();
      out = out.filter((m) => {
        const blob = `${m.title} ${m.description ?? ''} ${m.programme?.title ?? ''} ${m.moduleCode ?? ''}`.toLowerCase();
        return blob.includes(s);
      });
    }
    if (q.component && q.component !== 'all') {
      const c = q.component.toLowerCase();
      out = out.filter(
        (m) => m.poeComponent.toLowerCase() === c,
      );
    }
    if (q.artifact && q.artifact !== 'all') {
      if (q.artifact === 'km-only') {
        out = out.filter((m) => detectModuleFamily(m.moduleCode) === 'KM');
      } else if (q.artifact === 'pm-only') {
        out = out.filter((m) => detectModuleFamily(m.moduleCode) === 'PM');
      } else if (q.artifact === 'wm-only') {
        out = out.filter((m) => detectModuleFamily(m.moduleCode) === 'WM');
      } else if (q.artifact === 'other') {
        out = out.filter((m) => normalizeSlug(m.artifactSlug) === 'other');
      } else {
        out = out.filter((m) => m.artifactSlug === q.artifact);
      }
    }
    if (q.programmeId?.trim()) {
      const pid = q.programmeId.trim();
      out = out.filter((m) => m.programmeId === pid);
    }
    return out;
  }

  async list(user: AuthUser | undefined, query: ListMaterialsQueryDto) {
    const orgId = user?.organisationId;
    if (!orgId) {
      return {
        data: [],
        total: 0,
        page: 1,
        pageSize: 20,
        totalPages: 0,
      };
    }

    const where: Prisma.LearningMaterialWhereInput = {
      deletedAt: null,
      organisationId: orgId,
    };

    const rows = await this.prisma.learningMaterial.findMany({
      where,
      include: { programme: { select: { id: true, title: true } } },
      orderBy: { updatedAt: 'desc' },
    });

    const filtered = this.applyFilters(rows, query);
    const sorted = [...filtered].sort((a, b) => {
      const at = a.programme?.title ?? '\uFFFF';
      const bt = b.programme?.title ?? '\uFFFF';
      const byProg = at.localeCompare(bt, undefined, { sensitivity: 'base' });
      if (byProg !== 0) return byProg;
      return a.title.localeCompare(b.title, undefined, { sensitivity: 'base' });
    });
    const data = sorted.map((r) => this.toClientRow(r));

    return {
      data,
      total: data.length,
      page: 1,
      pageSize: 20,
      totalPages: 1,
    };
  }

  async createRecord(user: AuthUser | undefined, dto: CreateLearningMaterialDto) {
    const organisationId = this.requireOrganisationId(user);
    const uploadedById = user?.userId;
    if (!uploadedById) throw new BadRequestException('Authenticated user required');

    const p = await this.prisma.programme.findFirst({
      where: {
        id: dto.programmeId,
        organisationId,
        deletedAt: null,
      },
    });
    if (!p) throw new NotFoundException('Programme not found for this organisation');

    const slug = normalizeSlug(dto.artifactSlug);
    const mediaKind = mediaKindFromDto(dto);
    const formatLabel = formatFromDto(dto);

    const stored = await this.prisma.learningMaterial.create({
      data: {
        organisationId,
        programmeId: dto.programmeId,
        title: dto.title.trim(),
        description: dto.description?.trim(),
        moduleCode: dto.moduleCode?.trim() || null,
        artifactSlug: slug,
        artifactTypeLabel: dto.artifactType?.trim() || ARTIFACT_LABELS[slug] || null,
        poeComponent:
          dto.poeComponent?.trim() ||
          defaultPoeComponentForSlug(slug, dto.moduleCode),
        moduleKey: dto.moduleId?.trim() || null,
        moduleLabel: dto.moduleName?.trim() || null,
        mediaKind,
        formatLabel,
        fileName: null,
        fileSizeBytes: 0,
        storageKey: null,
        url: dto.fileUrl?.trim() || '/materials/placeholder',
        viewCount: dto.viewCount ?? 0,
        downloadCount: dto.downloadCount ?? 0,
        completionCount: dto.completionCount ?? 0,
        isApproved: dto.isApproved !== false,
        isAIEnhanced: dto.isAIEnhanced ?? false,
        uploadedById,
      },
      include: { programme: { select: { id: true, title: true } } },
    });

    return {
      success: true,
      data: this.toClientRow(stored),
    };
  }

  async createWithFile(
    user: AuthUser | undefined,
    file: Express.Multer.File | undefined,
    dto: CreateLearningMaterialDto,
  ) {
    const organisationId = this.requireOrganisationId(user);
    const uploadedById = user?.userId;
    if (!uploadedById) throw new BadRequestException('Authenticated user required');

    const p = await this.prisma.programme.findFirst({
      where: {
        id: dto.programmeId,
        organisationId,
        deletedAt: null,
      },
    });
    if (!p) throw new NotFoundException('Programme not found for this organisation');

    const slug = normalizeSlug(dto.artifactSlug);
    const mediaKind = mediaKindFromDto(dto, file?.mimetype);
    const formatLabel = formatFromDto(dto, file?.mimetype);

    let url = '/materials/placeholder';
    let storageKey: string | null = null;
    let fileSizeBytes = 0;
    let fileName: string | null = null;

    if (file) {
      const up = await this.files.upload(file.originalname, file.buffer, file.mimetype, {
        prefix: 'materials',
        organisationId,
      });
      url = up.url;
      storageKey = up.key;
      fileSizeBytes = file.size;
      fileName = file.originalname;
    } else if (dto.fileUrl?.trim()) {
      url = dto.fileUrl.trim();
    }

    const stored = await this.prisma.learningMaterial.create({
      data: {
        organisationId,
        programmeId: dto.programmeId,
        title: dto.title.trim(),
        description: dto.description?.trim(),
        moduleCode: dto.moduleCode?.trim() || null,
        artifactSlug: slug,
        artifactTypeLabel: dto.artifactType?.trim() || ARTIFACT_LABELS[slug] || null,
        poeComponent:
          dto.poeComponent?.trim() ||
          defaultPoeComponentForSlug(slug, dto.moduleCode),
        moduleKey: dto.moduleId?.trim() || null,
        moduleLabel: dto.moduleName?.trim() || null,
        mediaKind,
        formatLabel,
        fileName,
        fileSizeBytes,
        storageKey,
        url,
        viewCount: dto.viewCount ?? 0,
        downloadCount: dto.downloadCount ?? 0,
        completionCount: dto.completionCount ?? 0,
        isApproved: dto.isApproved !== false,
        isAIEnhanced: dto.isAIEnhanced ?? false,
        uploadedById,
      },
      include: { programme: { select: { id: true, title: true } } },
    });

    return {
      success: true,
      data: this.toClientRow(stored),
    };
  }

  async downloadUrl(user: AuthUser | undefined, id: string) {
    const organisationId = this.requireOrganisationId(user);
    const material = await this.prisma.learningMaterial.findFirst({
      where: { id, organisationId, deletedAt: null },
      select: { storageKey: true, url: true },
    });
    if (!material) throw new NotFoundException('Material not found');
    if (!material.storageKey) return { downloadUrl: material.url };
    return {
      downloadUrl: await this.files.getSignedDownloadUrl(material.storageKey),
    };
  }

  async completeness(user: AuthUser | undefined, programmeId?: string) {
    const orgId = user?.organisationId;
    if (!orgId) {
      return { data: [], success: true };
    }

    const rows = await this.prisma.learningMaterial.findMany({
      where: {
        deletedAt: null,
        organisationId: orgId,
        ...(programmeId?.trim() ? { programmeId: programmeId.trim() } : {}),
      },
      include: { programme: { select: { id: true, title: true } } },
    });

    const reports = evaluateModuleCompleteness(
      rows.map((m) => ({
        id: m.id,
        title: m.title,
        moduleCode: m.moduleCode,
        artifactSlug: m.artifactSlug,
        programmeId: m.programmeId,
        programmeName: m.programme?.title ?? null,
      })),
      programmeId?.trim() || undefined,
    );

    return { data: reports, success: true };
  }
}
