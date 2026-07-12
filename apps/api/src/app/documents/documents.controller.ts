import { BadRequestException, Body, Controller, Post, UploadedFiles, UseGuards, UseInterceptors } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { SuppliersService } from '../suppliers/suppliers.service';
import { DocumentsService } from './documents.service';
import { ExtractDocumentsDto } from './dto/extract-documents.dto';
import { ApplyExtractionDto } from './dto/apply-extraction.dto';

const MAX_FILES = 5;
const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024; // 15 MB

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('documents')
export class DocumentsController {
  constructor(
    private readonly documentsService: DocumentsService,
    private readonly suppliersService: SuppliersService,
  ) {}

  @Post('extract')
  @UseInterceptors(FilesInterceptor('files', MAX_FILES, { limits: { fileSize: MAX_FILE_SIZE_BYTES } }))
  async extract(@UploadedFiles() files: Express.Multer.File[], @Body() dto: ExtractDocumentsDto) {
    if (!files || files.length === 0) {
      throw new BadRequestException('At least one document is required.');
    }
    const extracted = await this.documentsService.extract(
      dto.supplierId,
      files.map((f) => ({ buffer: f.buffer, mimetype: f.mimetype, originalname: f.originalname })),
    );
    return { supplierId: dto.supplierId, extracted };
  }

  @Post('apply')
  async apply(@Body() dto: ApplyExtractionDto) {
    if (dto.updates && Object.keys(dto.updates).length > 0) {
      await this.suppliersService.update(dto.supplierId, dto.updates);
    }
    for (const alert of dto.newAlerts ?? []) {
      await this.suppliersService.addAlert(dto.supplierId, alert);
    }
    return this.suppliersService.findOne(dto.supplierId);
  }
}
