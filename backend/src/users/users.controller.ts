import { Body, Controller, Get, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { AdminOnlyEndpoint } from '../common/decorators/admin-only-endpoint.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import type { AuthUser } from '../common/types/request-with-user';
import { UsersService } from './users.service';
import { AddUserMembershipDto, CreateUserDto } from './users.dto';

@ApiTags('Users')
@ApiBearerAuth()
@AdminOnlyEndpoint()
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Roles('ADMIN', 'PLATFORM_ADMIN')
  @Get()
  list(@Req() req: Request & { user?: AuthUser }) {
    return this.users.list(req.user);
  }

  @Roles('ADMIN', 'PLATFORM_ADMIN')
  @Get('roles')
  listRoles() {
    return this.users.listRoles();
  }

  @Roles('ADMIN', 'PLATFORM_ADMIN')
  @Post()
  create(
    @Body() dto: CreateUserDto,
    @Req() req: Request & { user?: AuthUser },
  ) {
    return this.users.create(dto, req.user);
  }

  @Roles('ADMIN', 'PLATFORM_ADMIN')
  @Post('memberships')
  addMembership(
    @Body() dto: AddUserMembershipDto,
    @Req() req: Request & { user?: AuthUser },
  ) {
    return this.users.addMembership(dto, req.user);
  }
}
