import {
  BadRequestException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import type { LoginDto, RegisterDto } from './auth.dto';
import { mapUserToApiProfile, type UserWithMemberships } from './user-mapper';
import { MailService } from '../mail/mail.service';
import {
  generateOpaqueRefreshToken,
  hashOpaqueToken,
} from '../common/crypto/token-crypto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly mail: MailService,
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
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
      },
    });
    return this.issueSession(user.id, user.email);
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

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    await this.logLoginAttempt(user.id, email, 'LOGIN_SUCCESS', meta, {});

    return this.issueSession(user.id, user.email);
  }

  private async fakeDelay() {
    await new Promise((r) => setTimeout(r, 140 + Math.floor(Math.random() * 120)));
  }

  private async issueSession(userId: string, email: string) {
    const apiUser = await this.buildUserResponse(userId);
    const { accessToken } = await this.signToken(userId, email);

    const refreshRaw = generateOpaqueRefreshToken();
    const tokenHash = hashOpaqueToken(refreshRaw);

    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash,
        expiresAt: this.refreshExpiryDate(),
      },
    });

    return {
      accessToken,
      refreshToken: refreshRaw,
      tokenType: 'Bearer' as const,
      user: apiUser,
    };
  }

  async refresh(body: { refreshToken: string }) {
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

    const newRaw = generateOpaqueRefreshToken();
    const newHash = hashOpaqueToken(newRaw);
    const expiresAt = this.refreshExpiryDate();

    await this.prisma.$transaction(async (tx) => {
      await tx.refreshToken.update({
        where: { id: row.id },
        data: { revokedAt: new Date() },
      });
      await tx.refreshToken.create({
        data: {
          userId: row.userId,
          tokenHash: newHash,
          expiresAt,
        },
      });
    });

    const { accessToken } = await this.signToken(row.userId, row.user.email);
    const apiUser = await this.buildUserResponse(row.userId);

    return {
      accessToken,
      refreshToken: newRaw,
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
        afterValue: { email, ...extra },
        ipAddress: meta?.ip,
        userAgent: meta?.userAgent,
      },
    });
  }

  private async signToken(userId: string, email: string) {
    const memberships = await this.prisma.userOrganisation.findMany({
      where: { userId, deletedAt: null },
      include: { role: true },
    });
    const primary =
      memberships.find((m) => m.isPrimary) ?? memberships[0];
    const payload = {
      userId,
      email,
      organisationId: primary?.organisationId,
      roleCodes: memberships.map((m) => m.role.code),
    };
    const accessToken = await this.jwt.signAsync(payload);
    return { accessToken, payload };
  }
}
