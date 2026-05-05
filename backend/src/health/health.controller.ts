import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('Health')
@SkipThrottle()
@Controller()
export class HealthController {
  @Public()
  @Get('health')
  health() {
    return { ok: true, ts: new Date().toISOString() };
  }
}
