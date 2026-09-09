import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Optional,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import {
  generateOpaqueRefreshToken,
  hashOpaqueToken,
} from '../common/crypto/token-crypto';
import type { AuthUser } from '../common/types/request-with-user';
import {
  isPlatformAdmin,
  requireOrganisationId,
} from '../common/tenant/tenant-scope';
import { MailDeliveryQueueService } from '../mail/mail-delivery-queue.service';

@Injectable()
export class InvitationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    private readonly config: ConfigService,
    @Optional() private readonly mailQueue?: MailDeliveryQueueService,
  ) {}

  async create(
    body: { email: string; roleId: string },
    user?: AuthUser,
  ) {
    const organisationId = requireOrganisationId(user);
    if (!user?.userId) throw new ForbiddenException('Authentication required');
    const email = body.email.toLowerCase().trim();
    const role = await this.prisma.role.findFirst({
      where: { id: body.roleId, deletedAt: null },
    });
    if (!role) throw new BadRequestException('Invalid roleId');
    if (role.code === 'PLATFORM_ADMIN' && !isPlatformAdmin(user)) {
      throw new ForbiddenException('Cannot invite platform admins');
    }

    const raw = generateOpaqueRefreshToken();
    const tokenHash = hashOpaqueToken(raw);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const invite = await this.prisma.invitation.create({
      data: {
        organisationId,
        email,
        roleId: body.roleId,
        tokenHash,
        invitedById: user.userId,
        expiresAt,
        mailStatus: 'PENDING',
        mailAttempts: 0,
      },
    });

    await this.deliverInviteMail(invite.id, email, raw);

    const refreshed = await this.prisma.invitation.findUniqueOrThrow({
      where: { id: invite.id },
    });
    return {
      id: refreshed.id,
      email,
      expiresAt: expiresAt.toISOString(),
      mailStatus: refreshed.mailStatus,
      mailAttempts: refreshed.mailAttempts,
    };
  }

  async retryMail(id: string, user?: AuthUser) {
    requireOrganisationId(user);
    const invite = await this.prisma.invitation.findFirst({
      where: {
        id,
        organisationId: requireOrganisationId(user),
        status: 'PENDING',
      },
    });
    if (!invite) throw new BadRequestException('Invitation not found');
    if (invite.mailAttempts >= 5) {
      throw new BadRequestException('Mail retry limit reached');
    }
    if (invite.lastMailedAt && invite.lastMailedAt > new Date(Date.now() - 60_000)) {
      throw new BadRequestException('Wait before retrying invitation delivery');
    }
    // Cannot recover raw token from hash — issue replacement token
    const raw = generateOpaqueRefreshToken();
    const tokenHash = hashOpaqueToken(raw);
    await this.prisma.invitation.update({
      where: { id },
      data: {
        tokenHash,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });
    await this.deliverInviteMail(id, invite.email, raw);
    return this.prisma.invitation.findUniqueOrThrow({ where: { id } });
  }

  private async deliverInviteMail(
    invitationId: string,
    email: string,
    rawToken: string,
  ) {
    const front =
      this.config.get<string>('FRONTEND_ORIGIN')?.split(',')[0]?.trim() ??
      'http://localhost:5173';
    const url = `${front}/register?invite=${encodeURIComponent(rawToken)}`;
    try {
      const receipt = await this.mail.sendActivation(email, url);
      const invite = await this.prisma.invitation.findUnique({ where: { id: invitationId } });
      await this.mailQueue?.recordAttempt({
        organisationId: invite?.organisationId,
        recipient: email,
        template: 'account-activation',
        status: 'SENT',
        providerMessageId: receipt?.providerMessageId,
      });
      await this.prisma.invitation.update({
        where: { id: invitationId },
        data: {
          mailStatus: 'SENT',
          mailAttempts: { increment: 1 },
          lastMailedAt: new Date(),
          lastMailError: null,
          lastProviderMessageId: receipt?.providerMessageId,
        },
      });
    } catch (err) {
      const invite = await this.prisma.invitation.findUnique({ where: { id: invitationId } });
      const message = err instanceof Error ? err.message : String(err);
      await this.mailQueue?.recordAttempt({
        organisationId: invite?.organisationId,
        recipient: email,
        template: 'account-activation',
        status: 'FAILED',
        error: message,
      });
      await this.mailQueue?.enqueue({
        organisationId: invite?.organisationId,
        recipient: email,
        template: 'account-activation',
        actionUrl: url,
      });
      await this.prisma.invitation.update({
        where: { id: invitationId },
        data: {
          mailStatus: 'FAILED',
          mailAttempts: { increment: 1 },
          lastMailedAt: new Date(),
          lastMailError: message.slice(0, 500),
        },
      });
    }
  }

  /**
   * Atomically create the user, membership, and accept the invitation.
   * Rolls back all three if any step fails.
   */
  async acceptAndCreateUser(
    token: string,
    data: {
      email: string;
      passwordHash: string;
      firstName: string;
      lastName: string;
    },
  ) {
    const tokenHash = hashOpaqueToken(token.trim());
    return this.prisma.$transaction(async (tx) => {
      const invite = await tx.invitation.findFirst({
        where: { tokenHash, status: 'PENDING' },
      });
      if (!invite || invite.expiresAt < new Date()) {
        throw new BadRequestException('Invitation is invalid or expired');
      }
      if (invite.email.toLowerCase() !== data.email.toLowerCase()) {
        throw new BadRequestException('Invitation email does not match');
      }
      const created = await tx.user.create({
        data: {
          email: data.email,
          passwordHash: data.passwordHash,
          firstName: data.firstName,
          lastName: data.lastName,
        },
      });
      await tx.userOrganisation.create({
        data: {
          userId: created.id,
          roleId: invite.roleId,
          organisationId: invite.organisationId,
        },
      });
      await tx.invitation.update({
        where: { id: invite.id },
        data: { status: 'ACCEPTED', acceptedAt: new Date() },
      });
      return created;
    });
  }

  async consume(token: string, userId: string, email: string) {
    const tokenHash = hashOpaqueToken(token.trim());
    return this.prisma.$transaction(async (tx) => {
      const invite = await tx.invitation.findFirst({
        where: { tokenHash, status: 'PENDING' },
      });
      if (!invite || invite.expiresAt < new Date()) {
        throw new BadRequestException('Invitation is invalid or expired');
      }
      if (invite.email.toLowerCase() !== email.toLowerCase()) {
        throw new BadRequestException('Invitation email does not match');
      }
      await tx.userOrganisation.create({
        data: {
          userId,
          roleId: invite.roleId,
          organisationId: invite.organisationId,
        },
      });
      return tx.invitation.update({
        where: { id: invite.id },
        data: { status: 'ACCEPTED', acceptedAt: new Date() },
      });
    });
  }

  async peek(token: string) {
    const tokenHash = hashOpaqueToken(token.trim());
    const invite = await this.prisma.invitation.findFirst({
      where: { tokenHash, status: 'PENDING' },
      include: { organisation: true, role: true },
    });
    if (!invite || invite.expiresAt < new Date()) {
      throw new BadRequestException('Invitation is invalid or expired');
    }
    return {
      email: invite.email,
      organisationName: invite.organisation.name,
      role: invite.role.code,
    };
  }
}
