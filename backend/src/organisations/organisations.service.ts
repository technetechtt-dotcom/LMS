import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrganisationDto } from './organisations.dto';

@Injectable()
export class OrganisationsService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.organisation.findMany({ where: { deletedAt: null } });
  }

  create(dto: CreateOrganisationDto) {
    return this.prisma.organisation.create({ data: dto });
  }
}
