import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service';
import { FinancialTransactionType } from '@prisma/client';

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

      // ===== REGRAS REGEX PARA SUGESTÃO DE MÉTODO DE PAGAMENTO =====
      const regexMatch = this.matchRegexRules(transactionTitle, transactionDescription, availablePaymentMethods);
      if (regexMatch) {
        console.log(`🎯 Sugestão de método de pagamento por regex aplicada: "${transactionTitle}" -> ${regexMatch.paymentMethodName} (${regexMatch.confidence}%)`);
        console.log(`📝 Motivo: ${regexMatch.reasoning}`);
        return regexMatch;
      }

      console.log(`❌ Nenhuma regra regex aplicável encontrada para método de pagamento: "${transactionTitle}"`);
      return null;

    } catch (error) {
      this.logger.error('Erro ao obter sugestão de método de pagamento:', error);
      return null;
    }
  }

  /**
   * Aplica regras regex para sugestão de método de pagamento
   */
  private matchRegexRules(
    transactionTitle: string,
    transactionDescription: string,
    availablePaymentMethods: Array<{ id: string; name: string }>,
  ): PaymentMethodSuggestion | null {
    // Combinar título e descrição para busca
    const searchText = `${transactionTitle} ${transactionDescription}`.toUpperCase();
    
    console.log(`🔍 Analisando regex para método de pagamento: "${searchText}"`);
    
    // Regras regex para métodos de pagamento específicos
    const regexRules = [
      {
        pattern: /\b(PIX|PIX\s+RECEBIMENTO|PIX\s+PAGAMENTO|PIX\s+TRANSFERENCIA|PIX\s+ENVIADO|PIX\s+RECEBIDO)\b/i,
        paymentMethodName: 'PIX',
        confidence: 100,
        reasoning: 'Identificado como transação PIX por regex',
      },
      {
        pattern: /\b(BOLETO|BOLETO\s+BANCARIO|BOLETO\s+PAGO|BOLETO\s+RECEBIDO|BOLETO\s+EMITIDO)\b/i,
        paymentMethodName: 'Boleto Bancário',
        confidence: 100,
        reasoning: 'Identificado como boleto bancário por regex',
      },
      {
        pattern: /\b(CARTAO\s+CREDITO|CARTAO\s+DE\s+CREDITO|CREDITO|COMPRA\s+CREDITO|PAGAMENTO\s+CREDITO)\b/i,
        paymentMethodName: 'Cartão de Crédito',
        confidence: 100,
        reasoning: 'Identificado como cartão de crédito por regex',
      },
      {
        pattern: /\b(CARTAO\s+DEBITO|CARTAO\s+DE\s+DEBITO|DEBITO|COMPRA\s+DEBITO|PAGAMENTO\s+DEBITO)\b/i,
        paymentMethodName: 'Cartão de Débito',
        confidence: 100,
        reasoning: 'Identificado como cartão de débito por regex',
      },
      {
        pattern: /\b(CHEQUE|CHEQUE\s+NUMERO|CHEQUE\s+COMPENSADO|CHEQUE\s+EMITIDO)\b/i,
        paymentMethodName: 'Cheque',
        confidence: 100,
        reasoning: 'Identificado como cheque por regex',
      },
      {
        pattern: /\b(DEBITO\s+AUTOMATICO|DEBITO\s+EM\s+CONTA|DEBITO\s+DIRETO|AUTOMATICO)\b/i,
        paymentMethodName: 'Débito Automático',
        confidence: 100,
        reasoning: 'Identificado como débito automático por regex',
      },
      {
        pattern: /\b(DINHEIRO|CASH|EFETIVO|ESPECIE)\b/i,
        paymentMethodName: 'Dinheiro',
        confidence: 100,
        reasoning: 'Identificado como dinheiro por regex',
      },
      {
        pattern: /\b(TRANSFERENCIA|TRANSFERENCIA\s+BANCARIA|TRANSFERENCIA\s+ENTRE\s+CONTAS|TED|DOC)\b/i,
        paymentMethodName: 'Transferência Bancária',
        confidence: 100,
        reasoning: 'Identificado como transferência bancária por regex',
      },
      {
        pattern: /\b(SAQUE|ATM|SAQUE\s+ATM|SAQUE\s+TERMINAL)\b/i,
        paymentMethodName: 'Dinheiro',
        confidence: 90,
        reasoning: 'Identificado como saque ATM (dinheiro) por regex',
      },
      {
        pattern: /\b(POS|COMPRA\s+POS|PAGAMENTO\s+POS|TERMINAL\s+POS)\b/i,
        paymentMethodName: 'Cartão de Débito',
        confidence: 85,
        reasoning: 'Identificado como compra POS (provavelmente débito) por regex',
      },
      {
        pattern: /\b(DEPOSITO|DEPOSITO\s+BANCARIO|DEPOSITO\s+EM\s+CONTA)\b/i,
        paymentMethodName: 'Transferência Bancária',
        confidence: 80,
        reasoning: 'Identificado como depósito bancário por regex',
      },
    ];

    // Aplicar regras regex
    for (const rule of regexRules) {
      if (rule.pattern.test(searchText)) {
        console.log(`✅ Regex match encontrado para método de pagamento: "${rule.pattern}" -> ${rule.paymentMethodName}`);
        
        // Encontrar o método de pagamento correspondente
        const paymentMethod = availablePaymentMethods.find(pm => 
          pm.name.toUpperCase() === rule.paymentMethodName.toUpperCase()
        );

        if (paymentMethod) {
          console.log(`🎯 Método de pagamento encontrado: ${paymentMethod.name} (ID: ${paymentMethod.id})`);
          return {
            paymentMethodId: paymentMethod.id,
            paymentMethodName: paymentMethod.name,
            confidence: rule.confidence,
            reasoning: rule.reasoning,
          };
        } else {
          console.log(`⚠️ Método de pagamento "${rule.paymentMethodName}" não encontrado nos métodos disponíveis`);
        }
      }
    }

    console.log(`❌ Nenhuma regra regex aplicável encontrada para método de pagamento`);
    return null;
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