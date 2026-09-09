import { Body, Controller, Get, Param, Patch, Post, Req, UploadedFile, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { Roles } from '../common/decorators/roles.decorator';
import type { AuthUser } from '../common/types/request-with-user';
import {
  ArrangePlacementDto,
  BulkImportLearnersDto,
  RecordVettingDto,
  RegisterContractDto,
  SignContractDto,
} from './qa-officer.dto';
import { QaOfficerService } from './qa-officer.service';
import { quarantineUploadOptions } from '../common/quarantine-upload';
import { FileStorageService } from '../common/file-storage.service';

@ApiTags('QA Officer')
@ApiBearerAuth()
@Controller('qa-officer')
export class QaOfficerController {
  constructor(
    private readonly qa: QaOfficerService,
    private readonly files: FileStorageService,
  ) {}

  @Roles('ADMIN', 'QA_OFFICER')
  @Get('overview')
  overview(@Req() req: Request & { user?: AuthUser }) {
    return this.qa.overview(req.user);
  }

  @Roles('ADMIN', 'QA_OFFICER')
  @Get('contracts')
  listContracts(@Req() req: Request & { user?: AuthUser }) {
    return this.qa.listContracts(req.user);
  }

  @Roles('ADMIN', 'QA_OFFICER')
  @Post('contracts')
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', quarantineUploadOptions({ maxFiles: 1, maxFields: 8 })))
  async registerContract(
    @Body() dto: RegisterContractDto,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Req() req: Request & { user?: AuthUser },
  ) {
    try {
      return await this.qa.registerContract(dto, file as never, req.user);
    } finally {
      await this.files.discardStaged(file as never);
    }
  }

  @Roles('ADMIN', 'QA_OFFICER')
  @Patch('contracts/:id/sign')
  signContract(
    @Param('id') id: string,
    @Body() dto: SignContractDto,
    @Req() req: Request & { user?: AuthUser },
  ) {
    return this.qa.signContract(id, dto, req.user);
  }

  @Roles('ADMIN', 'QA_OFFICER')
  @Get('vetting-queue')
  vettingQueue(@Req() req: Request & { user?: AuthUser }) {
    return this.qa.vettingQueue(req.user);
  }

  @Roles('ADMIN', 'QA_OFFICER')
  @Post('learners/bulk-import')
  bulkImport(
    @Body() dto: BulkImportLearnersDto,
    @Req() req: Request & { user?: AuthUser },
  ) {
    return this.qa.bulkImport(dto, req.user);
  }

  @Roles('ADMIN', 'QA_OFFICER')
  @Patch('enrollments/:id/vetting')
  recordVetting(
    @Param('id') id: string,
    @Body() dto: RecordVettingDto,
    @Req() req: Request & { user?: AuthUser },
  ) {
    return this.qa.recordVetting(id, dto, req.user);
  }

  @Roles('ADMIN', 'QA_OFFICER')
  @Get('placement-queue')
  placementQueue(@Req() req: Request & { user?: AuthUser }) {
    return this.qa.placementQueue(req.user);
  }

  @Roles('ADMIN', 'QA_OFFICER')
  @Patch('enrollments/:id/placement')
  arrangePlacement(
    @Param('id') id: string,
    @Body() dto: ArrangePlacementDto,
    @Req() req: Request & { user?: AuthUser },
  ) {
    return this.qa.arrangePlacement(id, dto, req.user);
  }
}
