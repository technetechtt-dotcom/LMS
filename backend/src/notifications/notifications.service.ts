import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async listForUser(userId: string | undefined) {
    if (!userId) {
      return { success: true as const, data: [] };
    }
    const rows = await this.prisma.inAppNotification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    const data = rows.map((r) => ({
      id: r.id,
      type: r.type,
      title: r.title,
      description: r.body ?? '',
      time: r.createdAt.toISOString(),
      read: Boolean(r.readAt),
    }));
    return { success: true as const, data };
  }

  async markRead(userId: string | undefined, id: string) {
    if (!userId) throw new NotFoundException('Notification not found');
    const found = await this.prisma.inAppNotification.findFirst({
      where: { id, userId },
    });
    if (!found) throw new NotFoundException('Notification not found');
    await this.prisma.inAppNotification.update({
      where: { id },
      data: { readAt: new Date() },
    });
    return { success: true as const, data: null };
  }

  async notify(
    userId: string,
    type: string,
    title: string,
    body: string,
    metadata?: Record<string, unknown>,
  ) {
    if (!userId) return;
    await this.prisma.inAppNotification.create({
      data: {
        userId,
        type,
        title,
        body,
        metadata: (metadata ?? undefined) as object | undefined,
      },
    });
  }
}
