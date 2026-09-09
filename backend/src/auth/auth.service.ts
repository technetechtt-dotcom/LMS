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
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import type { LoginDto, RegisterDto, UpdateProfileDto, ChangePasswordDto } from './auth.dto';
import { mapUserToApiProfile, type UserWithMemberships } from './user-mapper';
import { FileStorageService } from '../common/file-storage.service';
import type { StagedUploadFile } from '../common/quarantine-upload';
import { MailService } from '../mail/mail.service';
import { InvitationsService } from '../invitations/invitations.service';
import { redactAuditValue } from '../audit/audit-redact';
import {
  generateOpaqueRefreshToken,
  hashOpaqueToken,
} from '../common/crypto/token-crypto';
import type { AuthPortal } from './auth-cookies';
import { encodeBase32, verifyTotp } from '../common/crypto/totp';

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

  private mfaKey(): Buffer {
    const secret = this.config.get<string>('MFA_ENCRYPTION_KEY')?.trim()
      || this.config.get<string>('JOB_ENCRYPTION_KEY')?.trim()
      || this.config.get<string>('JWT_SECRET')?.trim()
      || 'development-mfa-encryption-key';
    return createHash('sha256').update(secret).digest();
  }

  private encryptMfaSecret(secret: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.mfaKey(), iv);
    const encrypted = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
    return [iv, cipher.getAuthTag(), encrypted]
      .map((part) => part.toString('base64url'))
      .join('.');
  }

  private decryptMfaSecret(payload: string): string {
    const [ivRaw, tagRaw, dataRaw] = payload.split('.');
    if (!ivRaw || !tagRaw || !dataRaw) throw new UnauthorizedException('MFA configuration is invalid');
    try {
      const decipher = createDecipheriv(
        'aes-256-gcm',
        this.mfaKey(),
        Buffer.from(ivRaw, 'base64url'),
      );
      decipher.setAuthTag(Buffer.from(tagRaw, 'base64url'));
      return Buffer.concat([
        decipher.update(Buffer.from(dataRaw, 'base64url')),
        decipher.final(),
      ]).toString('utf8');
    } catch {
      throw new UnauthorizedException('MFA configuration is invalid');
    }
  }

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

    if (!user.passwordSetAt) {
      await this.logLoginAttempt(user.id, email, 'LOGIN_BLOCKED_ACTIVATION', meta, {});
      throw new UnauthorizedException(
        'Account activation is required before sign in',
      );
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

    if (user.totpEnabled) {
      const secret = user.totpSecret ? this.decryptMfaSecret(user.totpSecret) : '';
      if (!secret || !dto.totpCode || !verifyTotp(secret, dto.totpCode)) {
        await this.logLoginAttempt(user.id, email, 'LOGIN_FAILURE_MFA', meta, {});
        throw new UnauthorizedException('A valid authenticator code is required');
      }
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
    codes: string[];
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
      codes,
    };
  }

  async beginMfaEnrollment(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.deletedAt || !user.isActive) {
      throw new UnauthorizedException('User not found');
    }
    if (user.totpEnabled) throw new BadRequestException('MFA is already enabled');
    const secret = encodeBase32(randomBytes(20));
    await this.prisma.user.update({
      where: { id: userId },
      data: { totpSecret: this.encryptMfaSecret(secret), totpEnabled: false },
    });
    const issuer = this.config.get<string>('MFA_ISSUER')?.trim() || 'SkillForge LMS';
    const uri = `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(user.email)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
    return { enabled: false, secret, otpauthUri: uri };
  }

  async confirmMfaEnrollment(userId: string, code: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.totpSecret || user.deletedAt || !user.isActive) {
      throw new BadRequestException('Start MFA enrollment first');
    }
    if (!verifyTotp(this.decryptMfaSecret(user.totpSecret), code)) {
      throw new BadRequestException('Invalid authenticator code');
    }
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: userId }, data: { totpEnabled: true } }),
      this.prisma.auditLog.create({
        data: {
          actorId: userId,
          entityType: 'Authentication',
          entityId: userId,
          action: 'MFA_ENABLED',
        },
      }),
    ]);
    return { enabled: true };
  }

  async disableMfa(userId: string, password: string, code: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.totpEnabled || !user.totpSecret || user.deletedAt) {
      throw new BadRequestException('MFA is not enabled');
    }
    const [passwordValid, codeValid] = await Promise.all([
      bcrypt.compare(password, user.passwordHash),
      Promise.resolve(verifyTotp(this.decryptMfaSecret(user.totpSecret), code)),
    ]);
    if (!passwordValid || !codeValid) throw new UnauthorizedException('Invalid MFA disable credentials');
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { totpEnabled: false, totpSecret: null },
      }),
      this.prisma.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
      this.prisma.auditLog.create({
        data: {
          actorId: userId,
          entityType: 'Authentication',
          entityId: userId,
          action: 'MFA_DISABLED',
        },
      }),
    ]);
    return { enabled: false };
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

    const refreshSession = await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash,
        expiresAt: this.refreshExpiryDate(),
        portal,
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
        portal,
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

    const rotated = await this.prisma.refreshToken.updateMany({
      where: {
        id: row.id,
        tokenHash: hash,
        portal,
        revokedAt: null,
      },
      data: {
        tokenHash: newHash,
        expiresAt,
        lastUsedAt: new Date(),
      },
    });
    if (rotated.count !== 1) {
      throw new UnauthorizedException('Refresh token was already rotated');
    }

    const { accessToken } = await this.signToken(
      row.userId,
      row.user.email,
      row.id,
      portal,
    );
    const apiUser = await this.buildUserResponse(row.userId);

    return {
      accessToken,
      refreshToken: newRaw,
      sessionId: row.id,
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

  async logoutSession(userId: string, sessionId: string) {
    await this.prisma.refreshToken.updateMany({
      where: { id: sessionId, userId, revokedAt: null },
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
      const consumed = await tx.passwordResetToken.updateMany({
        where: {
          id: row.id,
          usedAt: null,
          expiresAt: { gt: new Date() },
        },
        data: { usedAt: new Date() },
      });
      if (consumed.count !== 1) {
        throw new BadRequestException('Invalid or expired reset link');
      }
      await tx.user.update({
        where: { id: row.userId },
        data: { passwordHash, passwordSetAt: new Date(), isActive: true },
      });
      await tx.refreshToken.updateMany({
        where: { userId: row.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      await tx.passwordResetToken.updateMany({
        where: { userId: row.userId, usedAt: null },
        data: { usedAt: new Date() },
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

  async getPreferences(userId: string) {
    const row = await this.prisma.userPreference.findUnique({
      where: { userId },
    });
    return (row?.value as Record<string, unknown> | undefined) ?? {};
  }

  async updatePreferences(userId: string, value: Record<string, unknown>) {
    const allowedKeys = new Set([
      'notifyAssessment',
      'notifyCompliance',
      'notifyMarketing',
      'notifySmsSecurity',
      'notifySmsUrgent',
      'language',
      'timezone',
    ]);
    const sanitized = Object.fromEntries(
      Object.entries(value).filter(([key, item]) =>
        allowedKeys.has(key) && ['string', 'boolean'].includes(typeof item),
      ),
    ) as Prisma.InputJsonObject;
    const row = await this.prisma.userPreference.upsert({
      where: { userId },
      create: { userId, value: sanitized },
      update: { value: sanitized },
    });
    return row.value as Record<string, unknown>;
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
    file: StagedUploadFile | undefined,
    organisationId?: string,
  ) {
    if (!file) {
      throw new BadRequestException('Signature file is required');
    }
    if (!this.files) {
      throw new BadRequestException('File storage is not configured');
    }
    const stored = await this.files.uploadStaged(file, {
      prefix: 'signatures',
      organisationId: organisationId ?? 'platform',
      uploadedById: userId,
    });
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
      data: { passwordHash, passwordSetAt: new Date() },
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
