import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Optional,
} from '@nestjs/common';
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

function generateTemporaryPassword(): string {
  return `${randomBytes(18).toString('base64url')}Aa1!`.slice(0, 20);
}

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly mail?: MailService,
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

  async create(dto: CreateUserDto, _user?: AuthUser) {
    const temporaryPassword =
      dto.password?.trim() || generateTemporaryPassword();
    const passwordHash = await bcrypt.hash(temporaryPassword, 10);
    const created = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        firstName: dto.firstName,
        lastName: dto.lastName,
        passwordHash,
        isActive: dto.isActive ?? true,
      },
    });
    try {
      await this.mail?.sendWelcome(
        created.email,
        created.firstName,
        temporaryPassword,
      );
    } catch {
      /* welcome mail is best-effort; password is returned once */
    }
    const { passwordHash: _omit, ...safe } = created;
    return { ...safe, temporaryPassword };
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
