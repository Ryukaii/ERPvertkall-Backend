import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service';
import { AiCategorizationService, CategorySuggestion } from './ai-categorization.service';
import { FinancialTransactionType, FinancialTransactionStatus } from '@prisma/client';
import { TagsService } from '../tags/tags.service';

export interface UpdateResult {
  id: string;
  success: boolean;
  result?: any;
  error?: string;
}

@Injectable()
export class OfxPendingTransactionService {
  constructor(
    private prisma: PrismaService,
    private aiCategorizationService: AiCategorizationService,
    private tagsService: TagsService,
  ) {}

  async getByImportId(importId: string) {
    const importRecord = await this.prisma.ofxImport.findUnique({
      where: { id: importId },
      include: {
        bank: true,
        pendingTransactions: {
          include: {
            suggestedCategory: true,
            finalCategory: true,
            tags: {
              include: {
                tag: true,
              },
            },
          },
          orderBy: {
            transactionDate: 'desc',
          },
        },
      },
    });

    if (!importRecord) {
      throw new NotFoundException('Importação OFX não encontrada');
    }

    return importRecord;
  }

  async findOne(id: string) {
    const transaction = await this.prisma.ofxPendingTransaction.findUnique({
      where: { id },
      include: {
        suggestedCategory: true,
        finalCategory: true,
        ofxImport: {
          include: {
            bank: true,
          },
        },
      },
    });

    if (!transaction) {
      throw new NotFoundException('Transação OFX pendente não encontrada');
    }

    return transaction;
  }

  async updateFinalCategory(transactionId: string, categoryId: string) {
    // Verificar se a categoria existe
    const category = await this.prisma.financialCategory.findUnique({
      where: { id: categoryId },
    });

    if (!category) {
      throw new BadRequestException('Categoria não encontrada');
    }

    // Atualizar a transação pendente
    const updatedTransaction = await this.prisma.ofxPendingTransaction.update({
      where: { id: transactionId },
      data: {
        finalCategoryId: categoryId,
      },
      include: {
        suggestedCategory: true,
        finalCategory: true,
      },
    });

    return {
      message: 'Categoria atualizada com sucesso',
      transaction: updatedTransaction,
    };
  }

  async suggestCategory(transactionId: string): Promise<{
    message: string;
    suggestion: CategorySuggestion | null;
  }> {
    const suggestion = await this.aiCategorizationService.suggestCategoryForOfxTransaction(
      transactionId,
    );

    if (suggestion) {
      // Atualizar a transação com a nova sugestão
      await this.aiCategorizationService.updateOfxPendingTransactionCategory(
        transactionId,
        suggestion.categoryId,
        suggestion.confidence,
      );
    }

    return {
      message: suggestion ? 'Nova sugestão gerada' : 'Nenhuma sugestão pôde ser gerada',
      suggestion,
    };
  }

  async batchUpdateCategories(
    transactions: Array<{ id: string; categoryId: string }>,
  ) {
    const updates: UpdateResult[] = [];
    
    for (const { id, categoryId } of transactions) {
      try {
        const result = await this.updateFinalCategory(id, categoryId);
        updates.push({ id, success: true, result });
      } catch (error) {
        updates.push({ id, success: false, error: error.message });
      }
    }

    const successCount = updates.filter(u => u.success).length;
    const errorCount = updates.filter(u => !u.success).length;

    return {
      message: `${successCount} transações atualizadas com sucesso, ${errorCount} com erro`,
      updates,
      summary: {
        total: transactions.length,
        success: successCount,
        errors: errorCount,
      },
    };
  }

  async approveAndCreateTransactions(importId: string, userId: string) {
    // Buscar todas as transações pendentes do import
    const pendingTransactions = await this.prisma.ofxPendingTransaction.findMany({
      where: { ofxImportId: importId },
      include: {
        finalCategory: true,
        suggestedCategory: true,
        ofxImport: {
          include: {
            bank: true,
          },
        },
      },
    });

    if (pendingTransactions.length === 0) {
      throw new BadRequestException('Nenhuma transação pendente encontrada para este import');
    }

    const createdTransactions: any[] = [];
    const errors: Array<{ pendingTransactionId: string; error: string }> = [];

    // Converter cada transação pendente em FinancialTransaction
    for (const pending of pendingTransactions) {
      try {
        // Usar categoria final se definida, senão usar sugerida se confiança >= 70%
        let categoryId = pending.finalCategoryId;
        
        if (!categoryId && pending.suggestedCategoryId && (pending.confidence ?? 0) >= 70) {
          categoryId = pending.suggestedCategoryId;
        }

        const financialTransaction = await this.prisma.financialTransaction.create({
          data: {
            title: pending.title,
            description: pending.description,
            amount: pending.amount,
            type: pending.type,
            status: FinancialTransactionStatus.PAID,
            transactionDate: pending.transactionDate,
            dueDate: pending.transactionDate,
            paidDate: pending.transactionDate,
            categoryId,
            userId,
            bankId: pending.ofxImport.bankId,
            ofxImportId: importId,
          },
        });

        createdTransactions.push(financialTransaction);

      } catch (error) {
        errors.push({
          pendingTransactionId: pending.id,
          error: error.message,
        });
      }
    }

    // Atualizar status do import para COMPLETED
    await this.prisma.ofxImport.update({
      where: { id: importId },
      data: {
        status: 'COMPLETED',
      },
    });

    // Remover transações pendentes após aprovação bem-sucedida
    if (errors.length === 0) {
      await this.prisma.ofxPendingTransaction.deleteMany({
        where: { ofxImportId: importId },
      });
    }

    return {
      message: `Import aprovado! ${createdTransactions.length} transações criadas`,
      summary: {
        total: pendingTransactions.length,
        created: createdTransactions.length,
        errors: errors.length,
      },
      transactions: createdTransactions,
      errors,
    };
  }

  async getImportSummary(importId: string) {
    const importRecord = await this.prisma.ofxImport.findUnique({
      where: { id: importId },
      include: {
        bank: true,
      },
    });

    if (!importRecord) {
      throw new NotFoundException('Import não encontrado');
    }

    const pendingTransactions = await this.prisma.ofxPendingTransaction.findMany({
      where: { ofxImportId: importId },
      include: {
        suggestedCategory: true,
        finalCategory: true,
      },
    });

    const totalTransactions = pendingTransactions.length;
    const withFinalCategory = pendingTransactions.filter(t => t.finalCategoryId).length;
    const withSuggestedCategory = pendingTransactions.filter(t => t.suggestedCategoryId).length;
    const highConfidenceSuggestions = pendingTransactions.filter(t => (t.confidence ?? 0) >= 70).length;
    const uncategorized = pendingTransactions.filter(t => !t.finalCategoryId && (!t.suggestedCategoryId || (t.confidence ?? 0) < 70)).length;

    const totalAmount = pendingTransactions.reduce((sum, t) => sum + t.amount, 0);

    return {
      import: importRecord,
      summary: {
        totalTransactions,
        withFinalCategory,
        withSuggestedCategory,
        highConfidenceSuggestions,
        uncategorized,
        totalAmount,
        readyToApprove: uncategorized === 0,
      },
      transactions: pendingTransactions,
    };
  }

  async updateTags(transactionId: string, tagIds: string[]) {
    // Verificar se a transação existe
    const transaction = await this.prisma.ofxPendingTransaction.findUnique({
      where: { id: transactionId },
    });

    if (!transaction) {
      throw new NotFoundException('Transação pendente não encontrada');
    }

    // Validar tags se fornecidas
    if (tagIds.length > 0) {
      const validTags = await this.tagsService.findByIds(tagIds);
      if (validTags.length !== tagIds.length) {
        throw new BadRequestException('Uma ou mais tags são inválidas ou estão inativas');
      }
    }

    // Remover tags existentes
    await this.prisma.ofxPendingTransactionTag.deleteMany({
      where: { ofxPendingTransactionId: transactionId },
    });

    // Adicionar novas tags
    if (tagIds.length > 0) {
      await this.prisma.ofxPendingTransactionTag.createMany({
        data: tagIds.map(tagId => ({
          ofxPendingTransactionId: transactionId,
          tagId,
        })),
      });
    }

    // Retornar transação atualizada com tags
    return this.prisma.ofxPendingTransaction.findUnique({
      where: { id: transactionId },
      include: {
        suggestedCategory: true,
        finalCategory: true,
        tags: {
          include: {
            tag: true,
          },
        },
      },
    });
  }
} 