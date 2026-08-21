import { Global, Module } from '@nestjs/common';
import { AntivirusService } from './antivirus.service';
import { FileStorageService } from './file-storage.service';

@Global()
@Module({
  providers: [AntivirusService, FileStorageService],
  exports: [AntivirusService, FileStorageService],
})
export class FileStorageModule {}
