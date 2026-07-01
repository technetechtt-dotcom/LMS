import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AdminOnlyEndpoint } from '../common/decorators/admin-only-endpoint.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { UsersService } from './users.service';
import { AddUserMembershipDto, CreateUserDto } from './users.dto';

@ApiTags('Users')
@ApiBearerAuth()
@AdminOnlyEndpoint()
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Roles('ADMIN')
  @Get()
  list() {
    return this.users.list();
  }

  @Roles('ADMIN')
  @Post()
  create(@Body() dto: CreateUserDto) {
    return this.users.create(dto);
  }

  @Roles('ADMIN')
  @Post('memberships')
  addMembership(@Body() dto: AddUserMembershipDto) {
    return this.users.addMembership(dto);
  }
}
