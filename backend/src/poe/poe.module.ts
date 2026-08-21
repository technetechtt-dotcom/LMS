import { Module } from '@nestjs/common';
import { FileStorageService } from '../common/file-storage.service';
import { PoeController } from './poe.controller';
import { PoeService } from './poe.service';

@Module({
  controllers: [PoeController],
  providers: [PoeService, FileStorageService],
  exports: [PoeService],
})
export class PoeModule {}
