import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '../../config/config.service';
import { PrismaService } from '../../config/prisma.service';
import { FinancialTransactionType } from '@prisma/client';
import { RegexOptimizationService } from './services/regex-optimization.service';

export interface CategorySuggestion {
  categoryId: string;
  categoryName: string;
  confidence: number;
  reasoning: string;
}

@Injectable()
export class AiCategorizationService {
  private readonly logger = new Logger(AiCategorizationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly regexOptimization: RegexOptimizationService,
  ) {}

  async suggestCategoryForTransaction(
    transactionTitle: string,
    transactionDescription: string,
    amount: number,
    type: FinancialTransactionType,
  ): Promise<CategorySuggestion | null> {
    try {
      // Mapear DEBIT/CREDIT para PAYABLE/RECEIVABLE para buscar categorias apropriadas
      let categoryType: FinancialTransactionType;
      if (type === 'DEBIT') {
        categoryType = 'PAYABLE';
      } else if (type === 'CREDIT') {
        categoryType = 'RECEIVABLE';
      } else {
        // Para tipos PAYABLE/RECEIVABLE, manter como está
        categoryType = type;
      }
      
      const availableCategories = await this.prisma.financialCategory.findMany({
        where: { type: categoryType },
        select: {
          id: true,
          name: true,
          description: true,
        },
        orderBy: { name: 'asc' },
      });

      if (availableCategories.length === 0) {
        this.logger.warn(`Nenhuma categoria encontrada para o tipo: ${categoryType}`);
        return null;
      }

      // ===== REGRAS REGEX OTIMIZADAS PARA CATEGORIZAÇÃO AUTOMÁTICA =====
      const regexMatch = this.matchOptimizedRegexRules(transactionTitle, transactionDescription, availableCategories);
      if (regexMatch) {
        this.logger.log(`🎯 Categorização otimizada aplicada: "${transactionTitle}" -> ${regexMatch.categoryName} (${regexMatch.confidence}%)`);
        this.logger.log(`📝 Motivo: ${regexMatch.reasoning}`);
        return regexMatch;
      }

      this.logger.log(`❌ Nenhuma regra regex otimizada encontrada para: "${transactionTitle}"`);
      return null;

    } catch (error) {
      this.logger.error('Erro ao obter sugestão de categoria:', error);
      return null;
    }
  }

  /**
   * Aplica regras regex otimizadas para categorização automática
   */
  private matchOptimizedRegexRules(
    transactionTitle: string,
    transactionDescription: string,
    availableCategories: Array<{ id: string; name: string; description: string | null }>,
  ): CategorySuggestion | null {
    // Usar o serviço otimizado para buscar match (apenas na descrição)
    const match = this.regexOptimization.findCategoryMatch('', transactionDescription);
    
    if (!match) {
      return null;
    }

    this.logger.log(`🔍 Regex otimizado encontrou match: ${match.categoryName} (${match.confidence}%)`);
    
    // Encontrar a categoria correspondente
    const category = availableCategories.find(cat => 
      cat.name.toUpperCase() === match.categoryName.toUpperCase()
    );

    if (category) {
      this.logger.log(`🎯 Categoria encontrada: ${category.name} (ID: ${category.id})`);
      return {
        categoryId: category.id,
        categoryName: category.name,
        confidence: match.confidence,
        reasoning: match.reasoning,
      };
    } else {
      this.logger.warn(`⚠️ Categoria "${match.categoryName}" não encontrada nas categorias disponíveis`);
      return null;
    }
  }

  async categorizeTransaction(
    transactionId: string,
    categoryId: string,
    confidence: number,
    reasoning: string,
  ): Promise<void> {
    try {
      await this.prisma.financialTransaction.update({
        where: { id: transactionId },
        data: {
          categoryId,
          // Adicionar metadados da categorização (pode ser expandido no futuro)
          description: reasoning ? `${reasoning} (Categorização Regex - ${confidence}% confiança)` : undefined,
        },
      });

      this.logger.log(`Transação ${transactionId} categorizada com categoria ID ${categoryId} (confiança: ${confidence}%)`);
    } catch (error) {
      this.logger.error('Erro ao categorizar transação:', error);
      throw error;
    }
  }

  async getPendingCategorizationTransactions(userId: string): Promise<any[]> {
    return this.prisma.financialTransaction.findMany({
      where: {
        userId,
        categoryId: null,
        // Buscar apenas transações com bankId (importadas do OFX ou transações bancárias)
        bankId: { not: null },
      },
      include: {
        category: true,
        bank: true,
      },
      orderBy: {
        transactionDate: 'desc',
      },
    });
  }

  // Método específico para transações OFX pendentes
  async suggestCategoryForOfxTransaction(
    pendingTransactionId: string,
  ): Promise<CategorySuggestion | null> {
    try {
      // Buscar a transação OFX pendente
      const pendingTransaction = await this.prisma.ofxPendingTransaction.findUnique({
        where: { id: pendingTransactionId },
      });

      if (!pendingTransaction) {
        this.logger.error(`Transação OFX pendente ${pendingTransactionId} não encontrada`);
        return null;
      }

      return await this.suggestCategoryForTransaction(
        pendingTransaction.title,
        pendingTransaction.description || '',
        pendingTransaction.amount,
        pendingTransaction.type,
      );

    } catch (error) {
      this.logger.error('Erro ao obter sugestão para transação OFX pendente:', error);
      return null;
    }
  }

  // Método para atualizar categoria sugerida na transação OFX pendente
  async updateOfxPendingTransactionCategory(
    pendingTransactionId: string,
    categoryId: string,
    confidence: number,
  ): Promise<void> {
    try {
      const category = await this.prisma.financialCategory.findUnique({
        where: { id: categoryId },
        select: { name: true },
      });

      if (!category) {
        throw new Error(`Categoria ${categoryId} não encontrada`);
      }

      await this.prisma.ofxPendingTransaction.update({
        where: { id: pendingTransactionId },
        data: {
          suggestedCategoryId: categoryId,
          suggestedCategoryName: category.name,
          confidence,
        },
      });

      this.logger.log(`Transação OFX pendente ${pendingTransactionId} atualizada com categoria sugerida ${category.name} (${confidence}%)`);

    } catch (error) {
      this.logger.error('Erro ao atualizar categoria da transação OFX pendente:', error);
      throw error;
    }
  }
} 