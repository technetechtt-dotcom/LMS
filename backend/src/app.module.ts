import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { InvitationsModule } from './invitations/invitations.module';
import { OrganisationsModule } from './organisations/organisations.module';
import { ProgrammesModule } from './programmes/programmes.module';
import { EnrollmentsModule } from './enrollments/enrollments.module';
import { EvidenceModule } from './evidence/evidence.module';
import { AssessmentsModule } from './assessments/assessments.module';
import { ModerationModule } from './moderation/moderation.module';
import { ReportsModule } from './reports/reports.module';
import { AuditModule } from './audit/audit.module';
import { WorkplaceLogsModule } from './workplace-logs/workplace-logs.module';
import { AttendanceModule } from './attendance/attendance.module';
import { DocumentsModule } from './documents/documents.module';
import { MaterialsModule } from './materials/materials.module';
import { LearnersModule } from './learners/learners.module';
import { AssessmentInstancesModule } from './assessment-instances/assessment-instances.module';
import { ComplianceModule } from './compliance/compliance.module';
import { MessagesModule } from './messages/messages.module';
import { PoeModule } from './poe/poe.module';
import { NotificationsModule } from './notifications/notifications.module';
import { CertificatesModule } from './certificates/certificates.module';
import { PrivacyModule } from './privacy/privacy.module';
import { EnterpriseModule } from './enterprise/enterprise.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { TenantGuard } from './common/guards/tenant.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { AdminEndpointsGuard } from './common/guards/admin-endpoints.guard';
import { AuditInterceptor } from './common/interceptors/audit.interceptor';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { FileStorageModule } from './common/file-storage.module';
import { validateEnv } from './config/env.validation';
import { HealthController } from './health/health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 200 }]),
    PrismaModule,
    FileStorageModule,
    AuthModule,
    UsersModule,
    InvitationsModule,
    OrganisationsModule,
    ProgrammesModule,
    EnrollmentsModule,
    EvidenceModule,
    AssessmentsModule,
    ModerationModule,
    ReportsModule,
    AuditModule,
    WorkplaceLogsModule,
    AttendanceModule,
    DocumentsModule,
    MaterialsModule,
    LearnersModule,
    PoeModule,
    MessagesModule,
    ComplianceModule,
    AssessmentInstancesModule,
    NotificationsModule,
    CertificatesModule,
    PrivacyModule,
    EnterpriseModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: TenantGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: AdminEndpointsGuard },
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
  ],
})
export class AppModule {}
