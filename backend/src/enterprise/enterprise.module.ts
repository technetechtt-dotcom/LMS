import { Module } from '@nestjs/common';
import { EnterpriseController } from './enterprise.controller';

@Module({
  controllers: [EnterpriseController],
})
export class EnterpriseModule {}
