import { Module } from '@nestjs/common';
import { ProgrammesController } from './programmes.controller';
import { ProgrammesService } from './programmes.service';

@Module({
  controllers: [ProgrammesController],
  providers: [ProgrammesService],
  exports: [ProgrammesService],
})
export class ProgrammesModule {}
