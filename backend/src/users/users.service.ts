import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AddUserMembershipDto, CreateUserDto } from './users.dto';
import type { AuthUser } from '../common/types/request-with-user';
import {
  isPlatformAdmin,
  requireOrganisationId,
} from '../common/tenant/tenant-scope';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

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

  async create(dto: CreateUserDto, _user?: AuthUser) {
    const passwordHash = await bcrypt.hash(dto.password, 10);
    return this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        firstName: dto.firstName,
        lastName: dto.lastName,
        passwordHash,
        isActive: dto.isActive ?? true,
      },
    });
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
