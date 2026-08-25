import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { Throttle } from '@nestjs/throttler';
import { Roles } from '../common/decorators/roles.decorator';
import type { AuthUser } from '../common/types/request-with-user';
import { AttendanceService } from './attendance.service';
import { CreateAttendanceDto } from './attendance.dto';
import { PrismaService } from '../prisma/prisma.service';
import { requireOrganisationId } from '../common/tenant/tenant-scope';
import {
  generateOpaqueRefreshToken,
  hashOpaqueToken,
} from '../common/crypto/token-crypto';

@ApiTags('Attendance')
@ApiBearerAuth()
@Controller('attendance')
export class AttendanceController {
  constructor(
    private readonly attendance: AttendanceService,
    private readonly prisma: PrismaService,
  ) {}

  @Roles('ADMIN', 'FACILITATOR', 'QA_OFFICER', 'LEARNER', 'ASSESSOR')
  @Get()
  list(
    @Req() req: Request & { user?: AuthUser },
    @Query('enrollmentId') enrollmentId?: string,
  ) {
    return this.attendance.list(req.user, enrollmentId);
  }

  @Roles('ADMIN', 'FACILITATOR')
  @Throttle({ default: { ttl: 60_000, limit: 60 } })
  @Post()
  create(
    @Body() dto: CreateAttendanceDto,
    @Req() req: Request & { user?: AuthUser },
  ) {
    return this.attendance.create(dto, req.user);
  }

  /** Facilitator opens a time-boxed QR session for remote check-in. */
  @Roles('ADMIN', 'FACILITATOR')
  @Post('sessions')
  async openSession(
    @Body() body: { programmeId: string; ttlMinutes?: number },
    @Req() req: Request & { user?: AuthUser },
  ) {
    const organisationId = requireOrganisationId(req.user);
    const programme = await this.prisma.programme.findFirst({
      where: {
        id: body.programmeId,
        organisationId,
        deletedAt: null,
      },
    });
    if (!programme) throw new BadRequestException('Programme not found');
    const raw = generateOpaqueRefreshToken();
    const ttl = Math.min(Math.max(body.ttlMinutes ?? 30, 5), 180);
    const session = await this.prisma.attendanceSession.create({
      data: {
        organisationId,
        programmeId: body.programmeId,
        openedById: req.user!.userId,
        tokenHash: hashOpaqueToken(raw),
        expiresAt: new Date(Date.now() + ttl * 60_000),
      },
    });
    return {
      sessionId: session.id,
      expiresAt: session.expiresAt.toISOString(),
      qrToken: raw,
    };
  }

  /** Learner checks in with rotating QR token. */
  @Roles('LEARNER', 'ADMIN', 'FACILITATOR')
  @Throttle({ default: { ttl: 60_000, limit: 20 } })
  @Post('sessions/:id/check-in')
  async checkIn(
    @Param('id') id: string,
    @Body() body: { token: string; enrollmentId: string },
    @Req() req: Request & { user?: AuthUser },
  ) {
    const organisationId = requireOrganisationId(req.user);
    const session = await this.prisma.attendanceSession.findFirst({
      where: { id, organisationId },
    });
    if (!session || session.closedAt || session.expiresAt < new Date()) {
      throw new BadRequestException('Attendance session invalid or expired');
    }
    if (session.tokenHash !== hashOpaqueToken(body.token ?? '')) {
      throw new BadRequestException('Invalid session token');
    }
    return this.attendance.create(
      {
        enrollmentId: body.enrollmentId,
        sessionDate: new Date().toISOString(),
        status: 'PRESENT' as const,
      },
      req.user,
    );
  }
}
