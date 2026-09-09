import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import type { Request } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { plainToInstance } from 'class-transformer';
import { validateOrReject } from 'class-validator';
import { MaterialsService } from './materials.service';
import {
  CreateLearningMaterialDto,
  ListMaterialsQueryDto,
  MaterialsMultipartDto,
} from './materials.dto';
import { Roles } from '../common/decorators/roles.decorator';
import type { AuthUser } from '../common/types/request-with-user';
import { quarantineUploadOptions } from '../common/quarantine-upload';
import { FileStorageService } from '../common/file-storage.service';

@ApiTags('Materials')
@ApiBearerAuth()
@Controller('materials')
export class MaterialsController {
  constructor(
    private readonly materials: MaterialsService,
    private readonly files: FileStorageService,
  ) {}

  @Get('completeness')
  completeness(
    @Query('programmeId') programmeId: string | undefined,
    @Req() req: Request & { user?: AuthUser },
  ) {
    return this.materials.completeness(req.user, programmeId);
  }

  @Get()
  list(
    @Query() query: ListMaterialsQueryDto,
    @Req() req: Request & { user?: AuthUser },
  ) {
    return this.materials.list(req.user, query);
  }

  @Get(':id/download-url')
  downloadUrl(
    @Param('id') id: string,
    @Req() req: Request & { user?: AuthUser },
  ) {
    return this.materials.downloadUrl(req.user, id);
  }

  @Post('record')
  @Roles('ADMIN', 'FACILITATOR')
  createRecord(
    @Body() dto: CreateLearningMaterialDto,
    @Req() req: Request & { user?: AuthUser },
  ) {
    return this.materials.createRecord(req.user, dto);
  }

  @Post()
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @Roles('ADMIN', 'FACILITATOR')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', quarantineUploadOptions({ maxFiles: 1, maxFields: 4 })),
  )
  async upload(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() body: MaterialsMultipartDto,
    @Req() req: Request & { user?: AuthUser },
  ) {
    let raw: Record<string, unknown> = {};
    try {
      raw = body.metadata?.trim()
        ? (JSON.parse(body.metadata) as Record<string, unknown>)
        : {};
    } catch {
      await this.files.discardStaged(file as never);
      throw new BadRequestException('metadata must be valid JSON');
    }
    const dto = plainToInstance(CreateLearningMaterialDto, raw);
    if ((!dto.title || !dto.title.trim()) && file?.originalname) {
      dto.title =
        file.originalname.replace(/\.[^.]+$/, '').trim() || 'Untitled';
    }
    try {
      await validateOrReject(dto);
      return await this.materials.createWithFile(req.user, file as never, dto);
    } finally {
      await this.files.discardStaged(file as never);
    }
  }
}
