import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AddUserMembershipDto, CreateUserDto } from './users.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
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

  create(dto: CreateUserDto) {
    return this.prisma.user.create({ data: dto });
  }

  addMembership(dto: AddUserMembershipDto) {
    return this.prisma.userOrganisation.create({ data: dto });
  }
}
