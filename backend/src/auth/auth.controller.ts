import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../common/decorators/public.decorator';
import { AuthService } from './auth.service';
import {
  ForgotPasswordDto,
  LoginDto,
  RefreshTokenDto,
  RegisterDto,
  ResetPasswordDto,
} from './auth.dto';
import type { AuthUser } from '../common/types/request-with-user';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Throttle({ default: { ttl: 60_000, limit: 8 } })
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Public()
  @Throttle({ default: { ttl: 60_000, limit: 12 } })
  @Post('login')
  login(@Body() dto: LoginDto, @Req() req: Request) {
    return this.auth.login(dto, {
      ip: req.ip,
      userAgent:
        typeof req.headers['user-agent'] === 'string'
          ? req.headers['user-agent']
          : undefined,
    });
  }

  @Public()
  @Throttle({ default: { ttl: 300_000, limit: 5 } })
  @Post('refresh')
  refresh(@Body() dto: RefreshTokenDto) {
    return this.auth.refresh({ refreshToken: dto.refreshToken });
  }

  @Public()
  @Throttle({ default: { ttl: 300_000, limit: 5 } })
  @Post('forgot-password')
  forgotPassword(@Body() dto: ForgotPasswordDto, @Req() req: Request) {
    return this.auth.requestPasswordReset(dto.email, {
      ip: req.ip,
      userAgent:
        typeof req.headers['user-agent'] === 'string'
          ? req.headers['user-agent']
          : undefined,
    });
  }

  @Public()
  @Throttle({ default: { ttl: 60_000, limit: 8 } })
  @Post('reset-password')
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.auth.confirmPasswordReset(dto.token, dto.password);
  }

  @ApiBearerAuth()
  @Post('logout')
  logout(@Req() req: Request & { user?: AuthUser }) {
    const userId = req.user?.userId;
    if (!userId) throw new UnauthorizedException('Invalid session');
    return this.auth.logoutEverywhere(userId);
  }

  @ApiBearerAuth()
  @Get('me')
  me(@Req() req: Request & { user?: AuthUser }) {
    const userId = req.user?.userId;
    if (!userId) throw new UnauthorizedException('Invalid session');
    return this.auth.getProfile(userId);
  }
}
