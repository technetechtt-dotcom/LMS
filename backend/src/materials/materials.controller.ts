import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import type { Request } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
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

@ApiTags('Materials')
@ApiBearerAuth()
@Controller('materials')
export class MaterialsController {
  constructor(private readonly materials: MaterialsService) {}

  @Get()
  list(
    @Query() query: ListMaterialsQueryDto,
    @Req() req: Request & { user?: AuthUser },
  ) {
    return this.materials.list(req.user, query);
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
  @Roles('ADMIN', 'FACILITATOR')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 25 * 1024 * 1024 },
    }),
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
      throw new BadRequestException('metadata must be valid JSON');
    }
    const dto = plainToInstance(CreateLearningMaterialDto, raw);
    if ((!dto.title || !dto.title.trim()) && file?.originalname) {
      dto.title =
        file.originalname.replace(/\.[^.]+$/, '').trim() || 'Untitled';
    }
    await validateOrReject(dto);
    return this.materials.createWithFile(req.user, file, dto);
  }
}
