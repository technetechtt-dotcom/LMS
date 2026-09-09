import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrganisationDto } from './organisations.dto';
import type { AuthUser } from '../common/types/request-with-user';
import { isPlatformAdmin, requireOrganisationId } from '../common/tenant/tenant-scope';

@Injectable()
export class OrganisationsService {
  constructor(private readonly prisma: PrismaService) {}

  list(user?: AuthUser) {
    const where = isPlatformAdmin(user)
      ? { deletedAt: null }
      : { id: requireOrganisationId(user), deletedAt: null };
    return this.prisma.organisation.findMany({ where });
  }

  create(dto: CreateOrganisationDto) {
    return this.prisma.organisation.create({ data: dto });
  }
}
