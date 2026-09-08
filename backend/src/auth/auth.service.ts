import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import type { LoginDto, RegisterDto, UpdateProfileDto, ChangePasswordDto } from './auth.dto';
import { mapUserToApiProfile, type UserWithMemberships } from './user-mapper';
import { FileStorageService } from '../common/file-storage.service';
import { MailService } from '../mail/mail.service';
import { InvitationsService } from '../invitations/invitations.service';
import { redactAuditValue } from '../audit/audit-redact';
import {
  generateOpaqueRefreshToken,
  hashOpaqueToken,
} from '../common/crypto/token-crypto';
import type { AuthPortal } from './auth-cookies';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly mail: MailService,
    private readonly invitations: InvitationsService,
    @Optional() private readonly files?: FileStorageService,
  ) {}

  private refreshExpiryDate(): Date {
    const raw =
      this.config.get<string>('REFRESH_TOKEN_TTL_DAYS') ??
      this.config.get<string>('REFRESH_TOKEN_TTL_DAY') ??
      '7';
    const days = Math.max(1, Number(raw) || 7);
    const ms = days * 24 * 60 * 60 * 1000;
    return new Date(Date.now() + ms);
  }

  private passwordResetExpiryDate(): Date {
    const raw =
      this.config.get<string>('PASSWORD_RESET_TTL_MINUTES') ?? '60';
    const minutes = Math.max(5, Number(raw) || 60);
    return new Date(Date.now() + minutes * 60 * 1000);
  }

  async register(dto: RegisterDto) {
    const nodeEnv = this.config.get<string>('NODE_ENV') ?? 'development';
    const publicOk =
      nodeEnv !== 'production' &&
      (this.config.get<string>('PUBLIC_REGISTRATION') ?? '').toLowerCase() ===
        'true';
    if (!dto.inviteToken && !publicOk) {
      throw new BadRequestException(
        'Registration is by invitation only — provide inviteToken',
      );
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const email = dto.email.toLowerCase();

    if (dto.inviteToken) {
      const user = await this.invitations.acceptAndCreateUser(dto.inviteToken, {
        email,
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
      });
      return this.issueSession(user.id, user.email, 'lms');
    }

    const user = await this.prisma.user.create({
      data: {
        email,
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
      },
    });
    return this.issueSession(user.id, user.email, 'lms');
  }

  async login(
    dto: LoginDto,
    meta?: { ip?: string; userAgent?: string },
  ) {
    const email = dto.email.toLowerCase().trim();
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user || user.deletedAt || !user.isActive) {
      await this.logLoginAttempt(null, email, 'LOGIN_FAILURE_USER', meta, {
        reason: 'invalid_or_inactive',
      });
      await this.fakeDelay();
      throw new UnauthorizedException('Invalid credentials');
    }

    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) {
      await this.logLoginAttempt(user.id, email, 'LOGIN_FAILURE_PASSWORD', meta, {});
      await this.fakeDelay();
      throw new UnauthorizedException('Invalid credentials');
    }

    const portal = dto.portal ?? 'lms';
    const access = await this.userPortalAccess(user.id);
    if (portal === 'ops' && !access.platform) {
      throw new UnauthorizedException(
        'This account is not authorised for the ops console',
      );
    }
    if (portal === 'lms' && access.platform) {
      throw new UnauthorizedException(
        'Platform operators must sign in at http://localhost:5177',
      );
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    await this.logLoginAttempt(user.id, email, 'LOGIN_SUCCESS', meta, { portal });

    return this.issueSession(user.id, user.email, portal);
  }

  private async userPortalAccess(userId: string): Promise<{
    platform: boolean;
  }> {
    const rows = await this.prisma.userOrganisation.findMany({
      where: {
        userId,
        deletedAt: null,
        role: { deletedAt: null },
      },
      include: { role: { select: { code: true } } },
    });
    const codes = rows.map((r) => r.role.code);
    return {
      platform: codes.includes('PLATFORM_ADMIN'),
    };
  }

  private async userIsPlatformAdmin(userId: string): Promise<boolean> {
    const access = await this.userPortalAccess(userId);
    return access.platform;
  }

  private async fakeDelay() {
    await new Promise((r) => setTimeout(r, 140 + Math.floor(Math.random() * 120)));
  }

  private async issueSession(
    userId: string,
    email: string,
    portal: AuthPortal,
  ) {
    const apiUser = await this.buildUserResponse(userId);

    const refreshRaw = generateOpaqueRefreshToken();
    const tokenHash = hashOpaqueToken(refreshRaw);

    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    const refreshSession = await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash,
        expiresAt: this.refreshExpiryDate(),
      },
    });
    const { accessToken } = await this.signToken(
      userId,
      email,
      refreshSession.id,
      portal,
    );

    return {
      accessToken,
      refreshToken: refreshRaw,
      sessionId: refreshSession.id,
      tokenType: 'Bearer' as const,
      user: apiUser,
    };
  }

  async refresh(body: { refreshToken: string }, portal: AuthPortal = 'lms') {
    const hash = hashOpaqueToken(body.refreshToken.trim());
    const row = await this.prisma.refreshToken.findFirst({
      where: {
        tokenHash: hash,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: { user: true },
    });

    if (!row?.user?.email || row.user.deletedAt || !row.user.isActive) {
      throw new UnauthorizedException('Invalid refresh token');
    }
    const access = await this.userPortalAccess(row.userId);
    if (portal === 'ops' && !access.platform) {
      throw new UnauthorizedException(
        'This account is not authorised for the ops console',
      );
    }
    if (portal === 'lms' && access.platform) {
      throw new UnauthorizedException(
        'Platform operators must sign in at http://localhost:5177',
      );
    }

    const newRaw = generateOpaqueRefreshToken();
    const newHash = hashOpaqueToken(newRaw);
    const expiresAt = this.refreshExpiryDate();

    const refreshSession = await this.prisma.$transaction(async (tx) => {
      await tx.refreshToken.update({
        where: { id: row.id },
        data: { revokedAt: new Date() },
      });
      return tx.refreshToken.create({
        data: {
          userId: row.userId,
          tokenHash: newHash,
          expiresAt,
        },
      });
    });

    const { accessToken } = await this.signToken(
      row.userId,
      row.user.email,
      refreshSession.id,
      portal,
    );
    const apiUser = await this.buildUserResponse(row.userId);

    return {
      accessToken,
      refreshToken: newRaw,
      sessionId: refreshSession.id,
      tokenType: 'Bearer' as const,
      user: apiUser,
    };
  }

  async logoutEverywhere(userId: string) {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return { success: true as const, data: null };
  }

  async requestPasswordReset(
    emailRaw: string,
    meta?: { ip?: string; userAgent?: string },
  ): Promise<{ success: true }> {
    const email = emailRaw.toLowerCase().trim();
    const user = await this.prisma.user.findUnique({ where: { email } });

    await this.fakeDelay();

    if (!user || user.deletedAt || !user.isActive) {
      return { success: true };
    }

    await this.prisma.passwordResetToken.deleteMany({
      where: { userId: user.id, usedAt: null },
    });

    const raw = generateOpaqueRefreshToken();
    const tokenHash = hashOpaqueToken(raw);
    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt: this.passwordResetExpiryDate(),
      },
    });

    await this.prisma.auditLog.create({
      data: {
        actorId: user.id,
        entityType: 'Authentication',
        entityId: user.id,
        action: 'PASSWORD_RESET_REQUESTED',
        afterValue: { email },
        ipAddress: meta?.ip,
        userAgent: meta?.userAgent,
      },
    });

    const base =
      this.config.get<string>('FRONTEND_ORIGIN')?.split(',')[0]?.trim() ??
      'http://localhost:5173';
    const resetUrl = `${base}/reset-password?token=${raw}`;

    const reveal =
      (this.config.get<string>('LOG_PASSWORD_RESET_LINK') ?? '').toLowerCase() ===
      'true';
    if (reveal) {
      this.logger.warn(`[dev] Password reset link for ${email}: ${resetUrl}`);
    }

    try {
      await this.mail.sendPasswordReset(email, resetUrl);
    } catch (err) {
      this.logger.error(
        `Failed to send password reset email to ${email}`,
        err instanceof Error ? err.stack : undefined,
      );
      if (this.config.get<string>('NODE_ENV') === 'production') {
        throw err;
      }
    }

    return { success: true };
  }

  async confirmPasswordReset(tokenRaw: string, newPassword: string) {
    const hash = hashOpaqueToken(tokenRaw.trim());
    const row = await this.prisma.passwordResetToken.findFirst({
      where: {
        tokenHash: hash,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: { user: true },
    });

    if (!row?.user || row.user.deletedAt || !row.user.isActive) {
      throw new BadRequestException('Invalid or expired reset link');
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await this.prisma.$transaction(async (tx) => {
      await tx.passwordResetToken.update({
        where: { id: row.id },
        data: { usedAt: new Date() },
      });
      await tx.user.update({
        where: { id: row.userId },
        data: { passwordHash },
      });
      await tx.refreshToken.updateMany({
        where: { userId: row.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    });

    await this.prisma.auditLog.create({
      data: {
        actorId: row.userId,
        entityType: 'Authentication',
        entityId: row.userId,
        action: 'PASSWORD_RESET_COMPLETED',
        afterValue: { email: row.user.email },
      },
    });

    return { success: true as const, data: null };
  }

  async getProfile(userId: string) {
    return this.buildUserResponse(userId);
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const email = dto.email?.toLowerCase().trim();
    if (email) {
      const clash = await this.prisma.user.findFirst({
        where: { email, id: { not: userId }, deletedAt: null },
      });
      if (clash) {
        throw new BadRequestException('Email is already in use');
      }
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.firstName !== undefined ? { firstName: dto.firstName.trim() } : {}),
        ...(dto.lastName !== undefined ? { lastName: dto.lastName.trim() } : {}),
        ...(email ? { email } : {}),
        ...(dto.phone !== undefined ? { phone: dto.phone.trim() || null } : {}),
        ...(dto.jobTitle !== undefined ? { jobTitle: dto.jobTitle.trim() || null } : {}),
      },
    });

    await this.prisma.auditLog.create({
      data: {
        actorId: userId,
        entityType: 'User',
        entityId: userId,
        action: 'PROFILE_UPDATED',
        afterValue: { email: email ?? undefined },
      },
    });

    return this.buildUserResponse(userId);
  }

  async uploadSignature(
    userId: string,
    file: Express.Multer.File | undefined,
    organisationId?: string,
  ) {
    if (!file?.buffer?.length) {
      throw new BadRequestException('Signature file is required');
    }
    if (!this.files) {
      throw new BadRequestException('File storage is not configured');
    }
    const stored = await this.files.upload(
      file.originalname || 'signature.png',
      file.buffer,
      file.mimetype || 'image/png',
      { prefix: 'signatures', organisationId: organisationId ?? 'platform' },
    );
    await this.prisma.user.update({
      where: { id: userId },
      data: { signatureStorageKey: stored.key },
    });
    return this.buildUserResponse(userId);
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.deletedAt) {
      throw new UnauthorizedException('User not found');
    }
    const valid = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Current password is incorrect');
    }
    const passwordHash = await bcrypt.hash(dto.newPassword, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    await this.prisma.auditLog.create({
      data: {
        actorId: userId,
        entityType: 'Authentication',
        entityId: userId,
        action: 'PASSWORD_CHANGED',
      },
    });
    return { success: true as const };
  }

  private async buildUserResponse(userId: string) {
    const full = await this.loadUserWithMemberships(userId);
    const base = mapUserToApiProfile(full);
    const enrollment = await this.prisma.enrollment.findFirst({
      where: { learnerId: userId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    return {
      ...base,
      linkedLearnerId: enrollment?.id ?? null,
    };
  }

  private async loadUserWithMemberships(userId: string): Promise<UserWithMemberships> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        memberships: {
          where: { deletedAt: null },
          include: { role: true, organisation: true },
        },
      },
    });
    if (!user || user.deletedAt) {
      throw new UnauthorizedException('User not found');
    }
    return user as UserWithMemberships;
  }

  private async logLoginAttempt(
    actorId: string | null,
    email: string,
    action: string,
    meta: { ip?: string; userAgent?: string } | undefined,
    extra: Record<string, unknown>,
  ) {
    await this.prisma.auditLog.create({
      data: {
        actorId: actorId ?? undefined,
        entityType: 'Authentication',
        entityId: email,
        action,
        afterValue: redactAuditValue({ email, ...extra }) as object,
        ipAddress: meta?.ip,
        userAgent: meta?.userAgent,
      },
    });
  }

  private async signToken(
    userId: string,
    email: string,
    sessionId: string,
    portal: AuthPortal,
  ) {
    const memberships = await this.prisma.userOrganisation.findMany({
      where: { userId, deletedAt: null },
      include: { role: true },
    });
    const primary =
      memberships.find((m) => m.isPrimary) ?? memberships[0];
    const payload = {
      userId,
      email,
      sessionId,
      portal,
      organisationId: primary?.organisationId,
      roleCodes: memberships.map((m) => m.role.code),
    };
    const accessToken = await this.jwt.signAsync(payload);
    return { accessToken, payload };
  }
}
