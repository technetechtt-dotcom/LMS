import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthUser } from '../common/types/request-with-user';
import { requireOrganisationId } from '../common/tenant/tenant-scope';

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
  };
  return map[code] ?? m.role.name;
}

@Injectable()
export class MessagesService {
  constructor(private readonly prisma: PrismaService) {}

  private async mapMessage(row: {
    id: string;
    fromId: string;
    toId: string;
    content: string;
    isRead: boolean;
    createdAt: Date;
    updatedAt: Date;
    from: {
      firstName: string;
      lastName: string;
      memberships: Array<{ role: { code: string; name: string } }>;
    };
    to: { firstName: string; lastName: string };
  }) {
    return {
      id: row.id,
      fromId: row.fromId,
      fromName: `${row.from.firstName} ${row.from.lastName}`.trim(),
      fromRole: roleFromMemberships(row.from.memberships),
      toId: row.toId,
      toName: `${row.to.firstName} ${row.to.lastName}`.trim(),
      content: row.content,
      isRead: row.isRead,
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

  async send(actor: AuthUser | undefined, toId: string, content: string) {
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

    const row = await this.prisma.message.create({
      data: {
        organisationId,
        fromId,
        toId,
        content: content.trim(),
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
    return this.mapMessage(row);
  }
}
