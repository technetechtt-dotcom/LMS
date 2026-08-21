import { Module } from '@nestjs/common';
import { FileStorageService } from '../common/file-storage.service';
import { ComplianceController } from './compliance.controller';
import { ComplianceService } from './compliance.service';

@Module({
  controllers: [ComplianceController],
  providers: [ComplianceService, FileStorageService],
})
export class ComplianceModule {}
