import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { AddUserMembershipDto, CreateUserDto } from './users.dto';
import type { AuthUser } from '../common/types/request-with-user';
import {
  isPlatformAdmin,
  requireOrganisationId,
} from '../common/tenant/tenant-scope';
import * as bcrypt from 'bcrypt';
import { MailService } from '../mail/mail.service';
import { generateOpaqueRefreshToken, hashOpaqueToken } from '../common/crypto/token-crypto';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    private readonly config: ConfigService,
  ) {}

  list(user?: AuthUser) {
    if (isPlatformAdmin(user)) {
      return this.prisma.user.findMany({
        where: { deletedAt: null },
        include: {
          memberships: {
            include: { role: true, organisation: true },
            where: { deletedAt: null },
          },
          enrollments: {
            where: { deletedAt: null },
            take: 8,
            orderBy: { createdAt: 'desc' },
            include: {
              programme: { include: { qualification: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    const organisationId = requireOrganisationId(user);
    return this.prisma.user.findMany({
      where: {
        deletedAt: null,
        memberships: {
          some: { organisationId, deletedAt: null },
        },
      },
      include: {
        memberships: {
          include: { role: true, organisation: true },
          where: { deletedAt: null, organisationId },
        },
        enrollments: {
          where: {
            deletedAt: null,
            OR: [
              { sdioOrganisationId: organisationId },
              { programme: { organisationId } },
            ],
          },
          take: 8,
          orderBy: { createdAt: 'desc' },
          include: {
            programme: { include: { qualification: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  listRoles() {
    return this.prisma.role.findMany({
      where: { deletedAt: null },
      orderBy: { code: 'asc' },
      select: { id: true, code: true, name: true },
    });
  }

  async create(dto: CreateUserDto, user?: AuthUser) {
    const organisationId = isPlatformAdmin(user)
      ? dto.organisationId
      : requireOrganisationId(user);
    if (!organisationId) {
      throw new BadRequestException('organisationId is required');
    }
    if (!user?.userId) throw new ForbiddenException('Authentication required');

    const email = dto.email.toLowerCase().trim();
    const rawActivation = generateOpaqueRefreshToken();
    const tokenHash = hashOpaqueToken(rawActivation);
    const unusablePassword = randomBytes(48).toString('base64url');
    const passwordHash = await bcrypt.hash(unusablePassword, 10);
    const ttlHours = Math.max(
      1,
      Number(this.config.get<string>('ACTIVATION_TTL_HOURS') ?? '24') || 24,
    );
    const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000);

    const created = await this.prisma.$transaction(async (tx) => {
      const [role, organisation, existing, programme] = await Promise.all([
        tx.role.findFirst({ where: { id: dto.roleId, deletedAt: null } }),
        tx.organisation.findFirst({ where: { id: organisationId, deletedAt: null } }),
        tx.user.findFirst({ where: { email, deletedAt: null } }),
        dto.programmeId
          ? tx.programme.findFirst({
              where: { id: dto.programmeId, organisationId, deletedAt: null },
            })
          : Promise.resolve(null),
      ]);
      if (!role) throw new BadRequestException('Invalid roleId');
      if (!organisation) throw new BadRequestException('Invalid organisationId');
      if (existing) throw new BadRequestException('A user with this email already exists');
      if (role.code === 'PLATFORM_ADMIN' && !isPlatformAdmin(user)) {
        throw new ForbiddenException('Only platform admins may provision platform admins');
      }
      if (dto.programmeId && !programme) {
        throw new BadRequestException('Programme not found in the organisation');
      }
      if (dto.programmeId && role.code !== 'LEARNER') {
        throw new BadRequestException('Only learner accounts may be enrolled during provisioning');
      }

      const account = await tx.user.create({
        data: {
          email,
          firstName: dto.firstName.trim(),
          lastName: dto.lastName.trim(),
          passwordHash,
          passwordSetAt: null,
          isActive: true,
        },
      });
      await tx.userOrganisation.create({
        data: {
          userId: account.id,
          roleId: role.id,
          organisationId,
          isPrimary: true,
        },
      });
      if (programme) {
        await tx.enrollment.create({
          data: {
            learnerId: account.id,
            programmeId: programme.id,
            sdioOrganisationId: organisationId,
            status: 'ENROLLED',
            startedAt: new Date(),
            metadata: dto.enrollmentMetadata as object | undefined,
          },
        });
      }
      await tx.passwordResetToken.create({
        data: {
          userId: account.id,
          tokenHash,
          expiresAt,
          purpose: 'ACTIVATION',
        },
      });
      return account;
    });

    const front =
      this.config.get<string>('FRONTEND_ORIGIN')?.split(',')[0]?.trim() ??
      'http://localhost:5173';
    const activationUrl = `${front}/reset-password?token=${encodeURIComponent(rawActivation)}&activation=1`;
    let mailStatus: 'SENT' | 'FAILED' = 'SENT';
    try {
      await this.mail.sendActivation(created.email, activationUrl);
    } catch {
      mailStatus = 'FAILED';
    }
    const { passwordHash: _omit, ...safe } = created;
    return {
      ...safe,
      pendingActivation: true,
      activationExpiresAt: expiresAt.toISOString(),
      mailStatus,
    };
  }

  async addMembership(dto: AddUserMembershipDto, user?: AuthUser) {
    let organisationId: string;
    if (isPlatformAdmin(user)) {
      if (!dto.organisationId) {
        throw new BadRequestException(
          'organisationId is required for platform admins',
        );
      }
      organisationId = dto.organisationId;
    } else {
      organisationId = requireOrganisationId(user);
      if (dto.organisationId && dto.organisationId !== organisationId) {
        throw new ForbiddenException(
          'Organisation admins may only manage memberships in their own organisation',
        );
      }
    }

    const role = await this.prisma.role.findFirst({
      where: { id: dto.roleId, deletedAt: null },
    });
    if (!role) throw new BadRequestException('Invalid roleId');
    if (role.code === 'PLATFORM_ADMIN' && !isPlatformAdmin(user)) {
      throw new ForbiddenException(
        'Only platform admins may assign PLATFORM_ADMIN',
      );
    }

    const targetUser = await this.prisma.user.findFirst({
      where: { id: dto.userId, deletedAt: null },
    });
    if (!targetUser) throw new BadRequestException('Invalid userId');

    return this.prisma.userOrganisation.create({
      data: {
        userId: dto.userId,
        roleId: dto.roleId,
        organisationId,
      },
    });
  }
}
