import { Module } from '@nestjs/common';
import { MailService } from './mail.service';
import { MailDeliveryQueueService } from './mail-delivery-queue.service';

@Module({
  providers: [MailService, MailDeliveryQueueService],
  exports: [MailService, MailDeliveryQueueService],
})
export class MailModule {}
