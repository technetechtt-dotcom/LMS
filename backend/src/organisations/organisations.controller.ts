import { Body, Controller, Get, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AdminOnlyEndpoint } from '../common/decorators/admin-only-endpoint.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { CreateOrganisationDto } from './organisations.dto';
import { OrganisationsService } from './organisations.service';
import type { Request } from 'express';
import type { AuthUser } from '../common/types/request-with-user';

@ApiTags('Organisations')
@ApiBearerAuth()
@Controller('organisations')
export class OrganisationsController {
  constructor(private readonly organisations: OrganisationsService) {}

  @Get()
  list(@Req() req: Request & { user?: AuthUser }) {
    return this.organisations.list(req.user);
  }

  @AdminOnlyEndpoint()
  @Roles('ADMIN', 'PLATFORM_ADMIN')
  @Post()
  create(@Body() dto: CreateOrganisationDto) {
    return this.organisations.create(dto);
  }
}
