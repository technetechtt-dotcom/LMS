import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AdminOnlyEndpoint } from '../common/decorators/admin-only-endpoint.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { CreateProgrammeDto } from './programmes.dto';
import { ProgrammesService } from './programmes.service';

@ApiTags('Programmes & Qualifications')
@ApiBearerAuth()
@Controller('programmes')
export class ProgrammesController {
  constructor(private readonly programmes: ProgrammesService) {}

  @Get()
  list() {
    return this.programmes.list();
  }

  @Get(':id')
  byId(@Param('id') id: string) {
    return this.programmes.byId(id);
  }

  @AdminOnlyEndpoint()
  @Roles('ADMIN')
  @Post()
  create(@Body() dto: CreateProgrammeDto) {
    return this.programmes.create(dto);
  }
}
