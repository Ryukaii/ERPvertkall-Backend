import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Param, 
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { AiCategorizationService } from './ai-categorization.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ModuleAccessGuard } from '../../common/guards/module-access.guard';
import { PermissionGuard } from '../../common/guards/permission.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequireModule } from '../../common/decorators/module.decorator';
import { Permission } from '../../common/decorators/permission.decorator';
import { User } from '@prisma/client';
import { 
  CategorizeTransactionDto, 
  CategorizationResponseDto, 
  BatchCategorizationResponseDto 
} from './dto/categorization-response.dto';

@Controller('ai-categorization')
@UseGuards(JwtAuthGuard, ModuleAccessGuard, PermissionGuard)
@RequireModule('bancos')
export class AiCategorizationController {
  constructor(private readonly aiCategorizationService: AiCategorizationService) {}

  @Get('pending')
  @Permission('bancos', 'ai_categorization', 'read')
  async getPendingCategorizationTransactions(@CurrentUser() user: User) {
    return this.aiCategorizationService.getPendingCategorizationTransactions(user.id);
  }

  @Post('suggest/:transactionId')
  @Permission('bancos', 'ai_categorization', 'write')
  async suggestCategoryForTransaction(
    @Param('transactionId') transactionId: string,
    @CurrentUser() user: User,
  ): Promise<CategorizationResponseDto> {
    // Buscar a transação
    const transaction = await this.aiCategorizationService['prisma'].financialTransaction.findFirst({
      where: {
        id: transactionId,
        userId: user.id,
      },
      include: {
        category: true,
      },
    });

    if (!transaction) {
      throw new BadRequestException('Transação não encontrada');
    }

    if (transaction.categoryId) {
      throw new BadRequestException('Transação já possui categoria');
    }

    // Obter sugestão por regex
    const suggestion = await this.aiCategorizationService.suggestCategoryForTransaction(
      transaction.title,
      transaction.description || '',
      transaction.amount,
      transaction.type,
    );

    return {
      transactionId,
      suggestion,
      transaction: {
        id: transaction.id,
        title: transaction.title,
        description: transaction.description || undefined,
        amount: transaction.amount,
        type: transaction.type,
        transactionDate: transaction.transactionDate?.toISOString() || undefined,
      },
      // Informação sobre a sugestão
      autoApplied: false, // Sempre false, pois apenas sugere
      message: suggestion 
        ? `Sugestão por regex: ${suggestion.categoryName} (${suggestion.confidence}% confiança)`
        : 'Nenhuma regra regex aplicável encontrada',
    };
  }

  @Post('categorize/:transactionId')
  async categorizeTransaction(
    @Param('transactionId') transactionId: string,
    @Body() categorizeDto: CategorizeTransactionDto,
    @CurrentUser() user: User,
  ) {
    // Verificar se a transação existe e pertence ao usuário
    const transaction = await this.aiCategorizationService['prisma'].financialTransaction.findFirst({
      where: {
        id: transactionId,
        userId: user.id,
      },
    });

    if (!transaction) {
      throw new BadRequestException('Transação não encontrada');
    }

    // Verificar se a categoria existe
    const category = await this.aiCategorizationService['prisma'].financialCategory.findUnique({
      where: { id: categorizeDto.categoryId },
    });

    if (!category) {
      throw new BadRequestException('Categoria não encontrada');
    }

    // Aplicar categorização
    await this.aiCategorizationService.categorizeTransaction(
      transactionId,
      categorizeDto.categoryId,
      categorizeDto.confidence || 100,
      categorizeDto.reasoning || 'Categorização manual',
    );

    return {
      message: 'Transação categorizada com sucesso',
      transactionId,
      categoryId: categorizeDto.categoryId,
      categoryName: category.name,
    };
  }

  @Post('batch-suggest')
  async batchSuggestCategories(@CurrentUser() user: User): Promise<BatchCategorizationResponseDto> {
    const pendingTransactions = await this.aiCategorizationService.getPendingCategorizationTransactions(user.id);
    
    const suggestions: Array<{
      transactionId: string;
      transactionTitle: string;
      suggestion: any;
    }> = [];
    
    for (const transaction of pendingTransactions.slice(0, 10)) { // Limitar a 10 por vez
      try {
        const suggestion = await this.aiCategorizationService.suggestCategoryForTransaction(
          transaction.title,
          transaction.description || '',
          transaction.amount,
          transaction.type,
        );

        if (suggestion) {
          suggestions.push({
            transactionId: transaction.id,
            transactionTitle: transaction.title,
            suggestion,
          });
        }
      } catch (error) {
        console.error(`Erro ao sugerir categoria para transação ${transaction.id}:`, error);
      }
    }

    return {
      message: `Sugestões por regex geradas para ${suggestions.length} transações`,
      suggestions,
    };
  }
} 