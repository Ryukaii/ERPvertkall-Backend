import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Patch,
  Param, 
  Body, 
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { OfxPendingTransactionService } from './ofx-pending-transaction.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '@prisma/client';
import { UpdateOfxPendingTagsDto } from './dto/update-ofx-pending-tags.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

interface UpdatePendingCategoryDto {
  categoryId: string;
}

interface BatchUpdateCategoriesDto {
  transactions: Array<{
    id: string;
    categoryId: string;
  }>;
}

@ApiTags('OFX Pending Transactions')
@ApiBearerAuth()
@Controller('ofx-pending-transactions')
@UseGuards(JwtAuthGuard)
export class OfxPendingTransactionController {
  constructor(
    private readonly ofxPendingTransactionService: OfxPendingTransactionService,
  ) {}

  @Get('import/:importId')
  async getByImportId(@Param('importId') importId: string) {
    return this.ofxPendingTransactionService.getByImportId(importId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.ofxPendingTransactionService.findOne(id);
  }

  @Put(':id/category')
  async updateCategory(
    @Param('id') id: string,
    @Body() updateDto: UpdatePendingCategoryDto,
  ) {
    return this.ofxPendingTransactionService.updateFinalCategory(
      id,
      updateDto.categoryId,
    );
  }

  @Post(':id/suggest-category')
  async suggestCategory(@Param('id') id: string) {
    return this.ofxPendingTransactionService.suggestCategory(id);
  }

  @Put('batch-update-categories')
  async batchUpdateCategories(@Body() batchDto: BatchUpdateCategoriesDto) {
    return this.ofxPendingTransactionService.batchUpdateCategories(
      batchDto.transactions,
    );
  }

  @Post('import/:importId/approve')
  async approveImport(
    @Param('importId') importId: string,
    @CurrentUser() user: User,
  ) {
    return this.ofxPendingTransactionService.approveAndCreateTransactions(
      importId,
      user.id,
    );
  }

  @Get('import/:importId/summary')
  async getImportSummary(@Param('importId') importId: string) {
    return this.ofxPendingTransactionService.getImportSummary(importId);
  }

  @Patch(':id/tags')
  @ApiOperation({ summary: 'Atualizar tags de uma transação pendente OFX' })
  @ApiResponse({ status: 200, description: 'Tags atualizadas com sucesso.' })
  @ApiResponse({ status: 404, description: 'Transação não encontrada.' })
  @ApiResponse({ status: 400, description: 'Tags inválidas.' })
  async updateTags(
    @Param('id') id: string,
    @Body() updateTagsDto: UpdateOfxPendingTagsDto,
  ) {
    return this.ofxPendingTransactionService.updateTags(id, updateTagsDto.tagIds || []);
  }
} 