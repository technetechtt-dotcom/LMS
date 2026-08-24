import { Body, Controller, Get, Post, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { IsEmail, IsUUID } from 'class-validator';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import type { AuthUser } from '../common/types/request-with-user';
import { InvitationsService } from './invitations.service';

class CreateInvitationDto {
  @IsEmail()
  email!: string;

  @IsUUID()
  roleId!: string;
}

@ApiTags('Invitations')
@Controller('invitations')
export class InvitationsController {
  constructor(private readonly invitations: InvitationsService) {}

  @ApiBearerAuth()
  @Roles('ADMIN', 'PLATFORM_ADMIN')
  @Post()
  create(
    @Body() dto: CreateInvitationDto,
    @Req() req: Request & { user?: AuthUser },
  ) {
    return this.invitations.create(dto, req.user);
  }

  @Public()
  @Get('peek')
  peek(@Query('token') token: string) {
    return this.invitations.peek(token ?? '');
  }
}
