import { 
  Controller, 
  Post, 
  Get, 
  Delete, 
  Param, 
  Body, 
  UseInterceptors, 
  UploadedFile,
  BadRequestException,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { OfxImportService } from './ofx-import.service';
import { OfxBulkProcessorService } from './services/ofx-bulk-processor.service';
import { OfxClusterManager } from './workers/ofx-cluster-manager';
import { ImportOfxDto } from './dto/import-ofx.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ModuleAccessGuard } from '../../common/guards/module-access.guard';
import { PermissionGuard } from '../../common/guards/permission.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequireModule } from '../../common/decorators/module.decorator';
import { Permission } from '../../common/decorators/permission.decorator';
import { User } from '@prisma/client';

@Controller('ofx-import')
@UseGuards(JwtAuthGuard, ModuleAccessGuard, PermissionGuard)
@RequireModule('bancos')
export class OfxImportController {
  constructor(
    private readonly ofxImportService: OfxImportService,
    private readonly bulkProcessor: OfxBulkProcessorService,
    private readonly clusterManager: OfxClusterManager,
  ) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  @Permission('bancos', 'ofx_imports', 'write')
  async uploadOfxFile(
    @UploadedFile() file: Express.Multer.File,
    @Body() importOfxDto: ImportOfxDto,
    @CurrentUser() user: User,
  ) {
    if (!file) {
      throw new BadRequestException('Arquivo OFX é obrigatório');
    }

    if (!file.originalname.toLowerCase().endsWith('.ofx')) {
      throw new BadRequestException('Arquivo deve ter extensão .ofx');
    }

    // Criar registro de importação como PENDING
    const importRecord = await this.ofxImportService.createImport({
      ...importOfxDto,
      fileName: file.originalname,
    });

    // Iniciar processamento assíncrono
    this.ofxImportService.processOfxFileAsync(
      file.buffer,
      importRecord.id,
      user.id,
    );

    return {
      message: 'Arquivo OFX enviado para processamento',
      importId: importRecord.id,
      status: 'PENDING',
      totalTransactions: 0,
      processedTransactions: 0,
    };
  }



  @Get()
  @Permission('bancos', 'ofx_imports', 'read')
  async findAll() {
    return this.ofxImportService.findAll();
  }

  @Get(':id')
  @Permission('bancos', 'ofx_imports', 'read')
  async findOne(@Param('id') id: string) {
    return this.ofxImportService.findOne(id);
  }

  @Get(':id/status')
  @Permission('bancos', 'ofx_imports', 'read')
  async getImportStatus(@Param('id') id: string) {
    const status = await this.ofxImportService.getImportStatus(id);
    
    // Adicionar informações extras para o frontend
    return {
      ...status,
      canPoll: status.status === 'PENDING' || status.status === 'PROCESSING',
      estimatedTime: status.status === 'PROCESSING' ? '2-5 minutos' : null,
    };
  }

  @Delete(':id')
  @Permission('bancos', 'ofx_imports', 'delete')
  async remove(@Param('id') id: string) {
    await this.ofxImportService.remove(id);
    return { message: 'Importação OFX excluída com sucesso' };
  }

  @Get(':id/metrics')
  @Permission('bancos', 'ofx_imports', 'read')
  async getPerformanceMetrics(@Param('id') id: string) {
    const metrics = await this.bulkProcessor.getPerformanceMetrics(id);
    
    if (!metrics) {
      throw new NotFoundException('Importação OFX não encontrada');
    }
    
    return {
      ...metrics,
      clusterStats: this.clusterManager.getStats(),
    };
  }

  @Get('cluster/stats')
  @Permission('bancos', 'ofx_imports', 'read')
  async getClusterStats() {
    return {
      cluster: this.clusterManager.getStats(),
      message: 'Estatísticas do cluster OFX',
    };
  }
} 