import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AdminOnlyEndpoint } from '../common/decorators/admin-only-endpoint.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { CreateOrganisationDto } from './organisations.dto';
import { OrganisationsService } from './organisations.service';

@ApiTags('Organisations')
@ApiBearerAuth()
@Controller('organisations')
export class OrganisationsController {
  constructor(private readonly organisations: OrganisationsService) {}

  @Get()
  list() {
    return this.organisations.list();
  }

  @AdminOnlyEndpoint()
  @Roles('ADMIN')
  @Post()
  create(@Body() dto: CreateOrganisationDto) {
    return this.organisations.create(dto);
  }
}
