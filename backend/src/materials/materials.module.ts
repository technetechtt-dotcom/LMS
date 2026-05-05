import { Module } from '@nestjs/common';
import { MaterialsController } from './materials.controller';
import { MaterialsService } from './materials.service';
import { FileStorageService } from '../common/file-storage.service';

@Module({
  controllers: [MaterialsController],
  providers: [MaterialsService, FileStorageService],
})
export class MaterialsModule {}
