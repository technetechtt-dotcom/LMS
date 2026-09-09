import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthUser } from '../common/types/request-with-user';
import { requireOrganisationId } from '../common/tenant/tenant-scope';
import { FileStorageService } from '../common/file-storage.service';
import { NotificationsService } from '../notifications/notifications.service';
import type { StagedUploadFile } from '../common/quarantine-upload';

function roleFromMemberships(
  memberships: Array<{ role: { code: string; name: string } }>,
): string {
  const m = memberships[0];
  if (!m) return 'User';
  const code = m.role.code;
  const map: Record<string, string> = {
    ADMIN: 'Admin',
    PLATFORM_ADMIN: 'Platform Admin',
    FACILITATOR: 'Facilitator',
    LEARNER: 'Learner',
    ASSESSOR: 'Assessor',
    MODERATOR: 'Moderator',
    SETA: 'SETA Official',
    QA_OFFICER: 'QA Officer',
    MENTOR: 'Workplace Mentor',
  };
  return map[code] ?? m.role.name;
}

@Injectable()
export class MessagesService {
  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly files?: FileStorageService,
    @Optional() private readonly notifications?: NotificationsService,
  ) {}

  private async mapMessage(row: {
    id: string;
    fromId: string;
    toId: string;
    content: string;
    isRead: boolean;
    createdAt: Date;
    updatedAt: Date;
    metadata: unknown;
    from: {
      firstName: string;
      lastName: string;
      memberships: Array<{ role: { code: string; name: string } }>;
    };
    to: { firstName: string; lastName: string };
  }) {
    const meta = (row.metadata as { attachments?: unknown } | null) ?? {};
    return {
      id: row.id,
      fromId: row.fromId,
      fromName: `${row.from.firstName} ${row.from.lastName}`.trim(),
      fromRole: roleFromMemberships(row.from.memberships),
      toId: row.toId,
      toName: `${row.to.firstName} ${row.to.lastName}`.trim(),
      content: row.content,
      isRead: row.isRead,
      attachments: Array.isArray(meta.attachments) ? meta.attachments : [],
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  async listForUser(user?: AuthUser) {
    const userId = user?.userId;
    if (!userId) return [];
    const organisationId = requireOrganisationId(user);
    const rows = await this.prisma.message.findMany({
      where: {
        organisationId,
        OR: [{ fromId: userId }, { toId: userId }],
      },
      include: {
        from: {
          include: {
            memberships: {
              where: { organisationId, deletedAt: null },
              include: { role: true },
            },
          },
        },
        to: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    return Promise.all(rows.map((r) => this.mapMessage(r)));
  }

  async send(
    actor: AuthUser | undefined,
    toId: string,
    content: string,
    files?: StagedUploadFile[],
  ) {
    const fromId = actor?.userId;
    if (!fromId) throw new BadRequestException('Authentication required');
    if (!toId?.trim() || !content?.trim()) {
      throw new BadRequestException('toId and content are required');
    }

    const organisationId = requireOrganisationId(actor);

    const toMembership = await this.prisma.userOrganisation.findFirst({
      where: {
        userId: toId,
        organisationId,
        deletedAt: null,
      },
    });
    if (!toMembership) {
      throw new ForbiddenException(
        'Recipient is not a member of your organisation',
      );
    }

    const toUser = await this.prisma.user.findFirst({
      where: { id: toId, deletedAt: null },
    });
    if (!toUser) throw new NotFoundException('Recipient not found');

    const attachments: Array<{
      storageKey: string;
      fileName: string;
      mimeType: string;
      url: string;
      uploadId: string;
      checksum: string;
    }> = [];
    if (files?.length && this.files) {
      for (const file of files) {
        const stored = await this.files.uploadStaged(file, {
          prefix: 'messages',
          organisationId,
          uploadedById: fromId,
        });
        attachments.push({
          storageKey: stored.key,
          fileName: file.originalname,
          mimeType: stored.mimeType,
          url: stored.url,
          uploadId: stored.uploadId,
          checksum: stored.sha256,
        });
      }
    }

    const row = await this.prisma.message.create({
      data: {
        organisationId,
        fromId,
        toId,
        content: content.trim(),
        metadata: attachments.length ? { attachments } : undefined,
      },
      include: {
        from: {
          include: {
            memberships: {
              where: { organisationId, deletedAt: null },
              include: { role: true },
            },
          },
        },
        to: true,
      },
    });

    await this.notifications?.notify(
      toId,
      'message',
      'New message',
      content.trim().slice(0, 180),
      { messageId: row.id, fromId },
    );

    return this.mapMessage(row);
  }

  async markFromPeerRead(user: AuthUser | undefined, fromId: string) {
    const userId = user?.userId;
    if (!userId) throw new ForbiddenException('Authentication required');
    const organisationId = requireOrganisationId(user);
    if (!fromId?.trim()) throw new BadRequestException('fromId is required');
    await this.prisma.message.updateMany({
      where: {
        organisationId,
        toId: userId,
        fromId: fromId.trim(),
        isRead: false,
      },
      data: { isRead: true },
    });
    return { success: true };
  }
}
