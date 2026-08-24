import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
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

@Injectable()
export class InvitationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    private readonly config: ConfigService,
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
      },
    });

    const front =
      this.config.get<string>('FRONTEND_ORIGIN')?.split(',')[0]?.trim() ??
      'http://localhost:5173';
    const url = `${front}/register?invite=${encodeURIComponent(raw)}`;
    try {
      await this.mail.sendPasswordReset(email, url);
    } catch {
      // Invitation still created; mail failure is non-fatal in non-prod
    }

    return {
      id: invite.id,
      email,
      expiresAt: expiresAt.toISOString(),
      inviteUrl: this.config.get('NODE_ENV') === 'production' ? undefined : url,
    };
  }

  async consume(token: string, userId: string, email: string) {
    const tokenHash = hashOpaqueToken(token.trim());
    const invite = await this.prisma.invitation.findFirst({
      where: { tokenHash, status: 'PENDING' },
    });
    if (!invite || invite.expiresAt < new Date()) {
      throw new BadRequestException('Invitation is invalid or expired');
    }
    if (invite.email.toLowerCase() !== email.toLowerCase()) {
      throw new BadRequestException('Invitation email does not match');
    }
    await this.prisma.userOrganisation.create({
      data: {
        userId,
        roleId: invite.roleId,
        organisationId: invite.organisationId,
      },
    });
    await this.prisma.invitation.update({
      where: { id: invite.id },
      data: { status: 'ACCEPTED', acceptedAt: new Date() },
    });
    return invite;
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
