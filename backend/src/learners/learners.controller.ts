import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { LearnersService } from './learners.service';

@ApiTags('Learners')
@ApiBearerAuth()
@Controller('learners')
export class LearnersController {
  constructor(private readonly learners: LearnersService) {}

  @Roles('ADMIN', 'FACILITATOR', 'ASSESSOR', 'MODERATOR', 'QA_OFFICER', 'SETA')
  @Get()
  list(
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('programme') programme?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.learners.list({
      search,
      status,
      programme,
      dateFrom,
      dateTo,
    });
  }

  @Roles('ADMIN', 'FACILITATOR', 'ASSESSOR', 'MODERATOR', 'QA_OFFICER', 'SETA')
  @Get(':id')
  byId(@Param('id') id: string) {
    return this.learners.byId(id);
  }
}
