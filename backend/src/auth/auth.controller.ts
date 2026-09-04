import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
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
  clearAllRefreshCookies,
  portalFromRequest,
  readAllRefreshTokensFromRequest,
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
    const { refreshToken: _omit, sessionId: _sessionId, ...rest } = session as T & {
      sessionId?: string;
    };
    return rest;
  }

  @Public()
  @Throttle({ default: { ttl: 60_000, limit: 8 } })
  @Post('register')
  async register(
    @Body() dto: RegisterDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.auth.assertAccountSwitchAllowed(
      dto.email,
      readAllRefreshTokensFromRequest(req),
    );
    const session = await this.auth.register(dto);
    clearAllRefreshCookies(res, this.nodeEnv());
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
    await this.auth.assertAccountSwitchAllowed(
      dto.email,
      readAllRefreshTokensFromRequest(req),
    );
    const session = await this.auth.login({ ...dto, portal }, {
      ip: req.ip,
      userAgent:
        typeof req.headers['user-agent'] === 'string'
          ? req.headers['user-agent']
          : undefined,
    });
    clearAllRefreshCookies(res, this.nodeEnv());
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
    const session = await this.auth.refresh({ refreshToken: token }, portal);
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
    clearAllRefreshCookies(res, this.nodeEnv());
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
  @Post('me/signature')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  uploadSignature(
    @Req() req: Request & { user?: AuthUser },
    @UploadedFile() file: Express.Multer.File,
  ) {
    const userId = req.user?.userId;
    if (!userId) throw new UnauthorizedException('Invalid session');
    return this.auth.uploadSignature(userId, file, req.user?.organisationId);
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
