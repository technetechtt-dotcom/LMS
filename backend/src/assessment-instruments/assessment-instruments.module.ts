import { Module } from '@nestjs/common';
import { AssessmentInstrumentsController } from './assessment-instruments.controller';
import { AssessmentInstrumentsService } from './assessment-instruments.service';

@Module({
  controllers: [AssessmentInstrumentsController],
  providers: [AssessmentInstrumentsService],
  exports: [AssessmentInstrumentsService],
})
export class AssessmentInstrumentsModule {}
