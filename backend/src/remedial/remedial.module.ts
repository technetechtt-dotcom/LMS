import { Module } from '@nestjs/common';
import { RemedialController } from './remedial.controller';
import { RemedialService } from './remedial.service';

@Module({
  controllers: [RemedialController],
  providers: [RemedialService],
  exports: [RemedialService],
})
export class RemedialModule {}
