import { Module } from '@nestjs/common';
import { PoeModule } from '../poe/poe.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { CertificatesController } from './certificates.controller';
import { CertificatesService } from './certificates.service';

@Module({
  imports: [PoeModule, NotificationsModule],
  controllers: [CertificatesController],
  providers: [CertificatesService],
  exports: [CertificatesService],
})
export class CertificatesModule {}
