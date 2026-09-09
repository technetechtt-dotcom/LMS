import { Module } from '@nestjs/common';
import { LearnersController } from './learners.controller';
import { LearnersService } from './learners.service';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [UsersModule],
  controllers: [LearnersController],
  providers: [LearnersService],
  exports: [LearnersService],
})
export class LearnersModule {}
