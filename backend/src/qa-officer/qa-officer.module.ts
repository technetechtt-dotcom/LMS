import { Module } from '@nestjs/common';
import { LearnersModule } from '../learners/learners.module';
import { QaOfficerController } from './qa-officer.controller';
import { QaOfficerService } from './qa-officer.service';

@Module({
  imports: [LearnersModule],
  controllers: [QaOfficerController],
  providers: [QaOfficerService],
})
export class QaOfficerModule {}
