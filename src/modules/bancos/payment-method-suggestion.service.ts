import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service';
import { FinancialTransactionType } from '@prisma/client';
import { RegexOptimizationService } from './services/regex-optimization.service';

export interface PaymentMethodSuggestion {
  paymentMethodId: string;
  paymentMethodName: string;
  confidence: number;
  reasoning: string;
}

@Injectable()
export class PaymentMethodSuggestionService {
  private readonly logger = new Logger(PaymentMethodSuggestionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly regexOptimization: RegexOptimizationService,
  ) {}

  async suggestPaymentMethodForTransaction(
    transactionTitle: string,
    transactionDescription: string,
    amount: number,
    type: FinancialTransactionType,
  ): Promise<PaymentMethodSuggestion | null> {
    try {
      const availablePaymentMethods = await this.prisma.paymentMethod.findMany({
        where: { isActive: true },
        select: {
          id: true,
          name: true,
        },
        orderBy: { name: 'asc' },
      });

      if (availablePaymentMethods.length === 0) {
        this.logger.warn('Nenhum método de pagamento ativo encontrado');
        return null;
      }

      // ===== REGRAS REGEX OTIMIZADAS PARA SUGESTÃO DE MÉTODO DE PAGAMENTO =====
      const regexMatch = this.matchOptimizedRegexRules(transactionTitle, transactionDescription, availablePaymentMethods);
      if (regexMatch) {
        this.logger.log(`🎯 Sugestão otimizada de método de pagamento aplicada: "${transactionTitle}" -> ${regexMatch.paymentMethodName} (${regexMatch.confidence}%)`);
        this.logger.log(`📝 Motivo: ${regexMatch.reasoning}`);
        return regexMatch;
      }

      this.logger.log(`❌ Nenhuma regra regex otimizada encontrada para método de pagamento: "${transactionTitle}"`);
      return null;

    } catch (error) {
      this.logger.error('Erro ao obter sugestão de método de pagamento:', error);
      return null;
    }
  }

  /**
   * Aplica regras regex otimizadas para sugestão de método de pagamento
   */
  private matchOptimizedRegexRules(
    transactionTitle: string,
    transactionDescription: string,
    availablePaymentMethods: Array<{ id: string; name: string }>,
  ): PaymentMethodSuggestion | null {
    // Usar o serviço otimizado para buscar match (apenas na descrição)
    const match = this.regexOptimization.findPaymentMethodMatch('', transactionDescription);
    
    if (!match) {
      return null;
    }

    this.logger.log(`🔍 Regex otimizado encontrou match para pagamento: ${match.paymentMethodName} (${match.confidence}%)`);
    
    // Encontrar o método de pagamento correspondente
    const paymentMethod = availablePaymentMethods.find(pm => 
      pm.name.toUpperCase() === match.paymentMethodName.toUpperCase()
    );

    if (paymentMethod) {
      this.logger.log(`🎯 Método de pagamento encontrado: ${paymentMethod.name} (ID: ${paymentMethod.id})`);
      return {
        paymentMethodId: paymentMethod.id,
        paymentMethodName: paymentMethod.name,
        confidence: match.confidence,
        reasoning: match.reasoning,
      };
    } else {
      this.logger.warn(`⚠️ Método de pagamento "${match.paymentMethodName}" não encontrado nos métodos disponíveis`);
      return null;
    }
  }

  // Método específico para transações OFX pendentes
  async suggestPaymentMethodForOfxTransaction(
    pendingTransactionId: string,
  ): Promise<PaymentMethodSuggestion | null> {
    try {
      // Buscar a transação OFX pendente
      const pendingTransaction = await this.prisma.ofxPendingTransaction.findUnique({
        where: { id: pendingTransactionId },
      });

      if (!pendingTransaction) {
        this.logger.error(`Transação OFX pendente ${pendingTransactionId} não encontrada`);
        return null;
      }

      return await this.suggestPaymentMethodForTransaction(
        pendingTransaction.title,
        pendingTransaction.description || '',
        pendingTransaction.amount,
        pendingTransaction.type,
      );

    } catch (error) {
      this.logger.error('Erro ao obter sugestão de método de pagamento para transação OFX pendente:', error);
      return null;
    }
  }

  // Método para atualizar método de pagamento sugerido na transação OFX pendente
  async updateOfxPendingTransactionPaymentMethod(
    pendingTransactionId: string,
    paymentMethodId: string,
    confidence: number,
  ): Promise<void> {
    try {
      const paymentMethod = await this.prisma.paymentMethod.findUnique({
        where: { id: paymentMethodId },
        select: { name: true },
      });

      if (!paymentMethod) {
        throw new Error(`Método de pagamento ${paymentMethodId} não encontrado`);
      }

      await this.prisma.ofxPendingTransaction.update({
        where: { id: pendingTransactionId },
        data: {
          suggestedPaymentMethodId: paymentMethodId,
          suggestedPaymentMethodName: paymentMethod.name,
          paymentMethodConfidence: confidence,
        },
      });

      this.logger.log(`Transação OFX pendente ${pendingTransactionId} atualizada com método de pagamento sugerido ${paymentMethod.name} (${confidence}%)`);

    } catch (error) {
      this.logger.error('Erro ao atualizar método de pagamento da transação OFX pendente:', error);
      throw error;
    }
  }
} 