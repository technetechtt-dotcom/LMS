import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../common/decorators/public.decorator';
import { AuthService } from './auth.service';
import {
  ForgotPasswordDto,
  LoginDto,
  RefreshTokenDto,
  RegisterDto,
  ResetPasswordDto,
  UpdateProfileDto,
  ChangePasswordDto,
} from './auth.dto';
import type { AuthUser } from '../common/types/request-with-user';
import {
  clearRefreshCookie,
  portalFromRequest,
  readRefreshFromRequest,
  setRefreshCookie,
} from './auth-cookies';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService,
  ) {}

  private nodeEnv() {
    return this.config.get<string>('NODE_ENV') ?? 'development';
  }

  private refreshTtlDays() {
    const raw =
      this.config.get<string>('REFRESH_TOKEN_TTL_DAYS') ??
      this.config.get<string>('REFRESH_TOKEN_TTL_DAY') ??
      '7';
    return Math.max(1, Number(raw) || 7);
  }

  private attachRefreshCookie(
    res: Response,
    refreshToken: string,
    portal: 'lms' | 'ops' = 'lms',
  ) {
    setRefreshCookie(
      res,
      refreshToken,
      this.nodeEnv(),
      this.refreshTtlDays(),
      portal,
    );
  }

  private sessionWithoutRefreshToken<T extends { refreshToken: string }>(
    session: T,
  ) {
    const { refreshToken: _omit, ...rest } = session;
    return rest;
  }

  @Public()
  @Throttle({ default: { ttl: 60_000, limit: 8 } })
  @Post('register')
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const session = await this.auth.register(dto);
    this.attachRefreshCookie(res, session.refreshToken, 'lms');
    return this.sessionWithoutRefreshToken(session);
  }

  @Public()
  @Throttle({ default: { ttl: 60_000, limit: 12 } })
  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const portal = dto.portal ?? portalFromRequest(req);
    const session = await this.auth.login(dto, {
      ip: req.ip,
      userAgent:
        typeof req.headers['user-agent'] === 'string'
          ? req.headers['user-agent']
          : undefined,
    });
    this.attachRefreshCookie(res, session.refreshToken, portal);
    return this.sessionWithoutRefreshToken(session);
  }

  @Public()
  @Throttle({ default: { ttl: 300_000, limit: 5 } })
  @Post('refresh')
  async refresh(
    @Body() dto: RefreshTokenDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    // Prefer HttpOnly cookie; body token ignored in production.
    const portal = portalFromRequest(req);
    const fromBody =
      this.nodeEnv() === 'production' ? undefined : dto.refreshToken;
    const token = readRefreshFromRequest(req, fromBody, portal);
    if (!token) {
      throw new UnauthorizedException('Missing refresh token');
    }
    const session = await this.auth.refresh({ refreshToken: token });
    this.attachRefreshCookie(res, session.refreshToken, portal);
    return this.sessionWithoutRefreshToken(session);
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
  async logout(
    @Req() req: Request & { user?: AuthUser },
    @Res({ passthrough: true }) res: Response,
  ) {
    const userId = req.user?.userId;
    if (!userId) throw new UnauthorizedException('Invalid session');
    const portal = portalFromRequest(req);
    clearRefreshCookie(res, this.nodeEnv(), portal);
    return this.auth.logoutEverywhere(userId);
  }

  @ApiBearerAuth()
  @Get('me')
  me(@Req() req: Request & { user?: AuthUser }) {
    const userId = req.user?.userId;
    if (!userId) throw new UnauthorizedException('Invalid session');
    return this.auth.getProfile(userId);
  }

  @ApiBearerAuth()
  @Patch('me')
  updateMe(
    @Req() req: Request & { user?: AuthUser },
    @Body() dto: UpdateProfileDto,
  ) {
    const userId = req.user?.userId;
    if (!userId) throw new UnauthorizedException('Invalid session');
    return this.auth.updateProfile(userId, dto);
  }

  @ApiBearerAuth()
  @Post('change-password')
  changePassword(
    @Req() req: Request & { user?: AuthUser },
    @Body() dto: ChangePasswordDto,
  ) {
    const userId = req.user?.userId;
    if (!userId) throw new UnauthorizedException('Invalid session');
    return this.auth.changePassword(userId, dto);
  }

  @ApiBearerAuth()
  @Post('mfa/enroll')
  mfaEnroll() {
    return {
      enabled: false,
      message:
        'TOTP MFA enrollment is provisioned (User.totpEnabled) but authenticator pairing is not yet live',
    };
  }

  @Public()
  @Get('sso/status')
  ssoStatus() {
    return {
      saml: false,
      oidc: false,
      message: 'SSO/SAML/OIDC IdP integration is not enabled in this release',
    };
  }
}
