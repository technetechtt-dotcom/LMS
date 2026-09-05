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
import { generateOpaqueRefreshToken, hashOpaqueToken } from '../common/crypto/token-crypto';

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
    @Body() body: { programmeId: string; ttlMinutes?: number; title?: string },
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
    const expectedCount = await this.prisma.enrollment.count({
      where: {
        deletedAt: null,
        programmeId: body.programmeId,
        ...{
          OR: [
            { sdioOrganisationId: organisationId },
            { employerOrganisationId: organisationId },
            { programme: { organisationId } },
          ],
        },
      },
    });
    const session = await this.prisma.attendanceSession.create({
      data: {
        organisationId,
        programmeId: body.programmeId,
        openedById: req.user!.userId,
        tokenHash: hashOpaqueToken(raw),
        expiresAt: new Date(Date.now() + ttl * 60_000),
        scheduledAt: new Date(),
        expectedCount,
        title: body.title ?? programme.title,
      },
    });
    return {
      sessionId: session.id,
      expiresAt: session.expiresAt.toISOString(),
      qrToken: raw,
      expectedCount: session.expectedCount,
      title: session.title,
    };
  }

  @Roles('ADMIN', 'FACILITATOR', 'QA_OFFICER')
  @Get('summary')
  summary(@Req() req: Request & { user?: AuthUser }) {
    return this.attendance.summary(req.user);
  }

  @Roles('ADMIN', 'FACILITATOR')
  @Post('sessions/:id/close')
  closeSession(
    @Param('id') id: string,
    @Req() req: Request & { user?: AuthUser },
  ) {
    return this.attendance.closeSession(id, req.user);
  }

  /** Learner checks in with QR token (one check-in per session+enrollment). */
  @Roles('LEARNER', 'ADMIN', 'FACILITATOR')
  @Throttle({ default: { ttl: 60_000, limit: 20 } })
  @Post('sessions/:id/check-in')
  checkIn(
    @Param('id') id: string,
    @Body() body: { token: string; enrollmentId: string },
    @Req() req: Request & { user?: AuthUser },
  ) {
    return this.attendance.checkIn(id, body.token, body.enrollmentId, req.user);
  }
}
