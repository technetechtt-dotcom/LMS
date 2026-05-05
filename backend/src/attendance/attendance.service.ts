import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAttendanceDto } from './attendance.dto';

@Injectable()
export class AttendanceService {
  constructor(private readonly prisma: PrismaService) {}

  list(enrollmentId?: string) {
    return this.prisma.attendance.findMany({
      where: {
        deletedAt: null,
        ...(enrollmentId ? { enrollmentId } : {}),
      },
      include: {
        enrollment: {
          include: {
            learner: true,
            programme: { include: { qualification: true } },
          },
        },
      },
      orderBy: { sessionDate: 'desc' },
      take: 500,
    });
  }

  create(dto: CreateAttendanceDto) {
    return this.prisma.attendance.create({
      data: {
        ...dto,
        sessionDate: new Date(dto.sessionDate),
        latitude: dto.latitude,
        longitude: dto.longitude,
      },
    });
  }
}
