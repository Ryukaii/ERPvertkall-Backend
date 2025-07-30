import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '../../config/config.service';
import { PrismaService } from '../../config/prisma.service';
import { FinancialTransactionType } from '@prisma/client';

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

      // ===== REGRAS REGEX PARA CATEGORIZAÇÃO AUTOMÁTICA =====
      const regexMatch = this.matchRegexRules(transactionTitle, transactionDescription, availableCategories);
      if (regexMatch) {
        console.log(`🎯 Categorização por regex aplicada: "${transactionTitle}" -> ${regexMatch.categoryName} (${regexMatch.confidence}%)`);
        console.log(`📝 Motivo: ${regexMatch.reasoning}`);
        return regexMatch;
      }

      console.log(`❌ Nenhuma regra regex aplicável encontrada para: "${transactionTitle}"`);
      return null;

    } catch (error) {
      this.logger.error('Erro ao obter sugestão de categoria:', error);
      return null;
    }
  }

  /**
   * Aplica regras regex para categorização automática
   */
  private matchRegexRules(
    transactionTitle: string,
    transactionDescription: string,
    availableCategories: Array<{ id: string; name: string; description: string | null }>,
  ): CategorySuggestion | null {
    // Combinar título e descrição para busca
    const searchText = `${transactionTitle} ${transactionDescription}`.toUpperCase();
    
    console.log(`🔍 Analisando regex para: "${searchText}"`);
    
    // Regras regex para categorias específicas
    const regexRules = [
      {
        pattern: /\b(VT|VR)\b/i,
        categoryName: 'Folha',
        confidence: 100,
        reasoning: 'Identificado como VT/VR (Vale Transporte/Refeição) por regex',
      },
      {
        pattern: /\b(PREMIACAO|premiacao)\b/i,
        categoryName: 'Folha',
        confidence: 100,
        reasoning: 'Identificado como premiação por regex',
      },
      {
        pattern: /\b(LEADS|leads)\b/i,
        categoryName: 'Folha',
        confidence: 100,
        reasoning: 'Identificado como leads por regex',
      },
      {
        pattern: /\b(IOF)\b/i,
        categoryName: 'Impostos',
        confidence: 100,
        reasoning: 'Identificado como IOF (Imposto sobre Operações Financeiras) por regex',
      },
      {
        pattern: /\b(LUIS\s+FELIPE\s+LEITE\s+BARBOZA)\b/i,
        categoryName: 'Aporte Financeiro',
        confidence: 100,
        reasoning: 'Identificado como transação de LUIS FELIPE LEITE BARBOZA por regex',
      },
      {
        pattern: /\b(RECEBIMENTO\s+PIX\s+[A-Z\s]+\s+\*\*\*\.\d+\.\d+-\*\*)\b/i,
        categoryName: 'PARTICULAR',
        confidence: 100,
        reasoning: 'Identificado como recebimento PIX de pessoa física por regex',
      },
      {
        pattern: /\b(ACB|ASSOCIAÇÃO\s+ACB|ACB\s+ASSOC)\b/i,
        categoryName: 'Associação Medicas',
        confidence: 100,
        reasoning: 'Identificado como transação ACB por regex',
      },
      {
        pattern: /\b(AMAI|AMAI\s+ASSOC|ASSOCIAÇÃO\s+AMAI)\b/i,
        categoryName: 'Associação Medicas',
        confidence: 100,
        reasoning: 'Identificado como transação AMAI por regex',
      },
      {
        pattern: /\b(AMHP|AMHP\s+ASSOC|ASSOCIAÇÃO\s+AMHP)\b/i,
        categoryName: 'Associação Medicas',
        confidence: 100,
        reasoning: 'Identificado como transação AMHP por regex',
      },
      {
        pattern: /\b(ASMEPRO|ASMEPRO\s+ASSOC|ASSOCIAÇÃO\s+ASMEPRO)\b/i,
        categoryName: 'Associação Medicas',
        confidence: 100,
        reasoning: 'Identificado como transação ASMEPRO por regex',
      },
      {
        pattern: /\b(ASSOCIACAO\s+MEDICA\s+DO\s+CORPO\s+CLIN\s+DO)\b/i,
        categoryName: 'Associação Medicas',
        confidence: 100,
        reasoning: 'Identificado como transação ASSOCIACAO MEDICA DO CORPO CLIN DO por regex',
      },
      {
        pattern: /\b(PARTICULAR|PART|PARTIC)\b/i,
        categoryName: 'PARTICULAR',
        confidence: 100,
        reasoning: 'Identificado como transação PARTICULAR por regex',
      },
      {
        pattern: /\b(VENDA|VENDAS|VEND|VEND\s+PROD|PRODUTO|SERVIÇO|SERVICO)\b/i,
        categoryName: 'Vendas',
        confidence: 100,
        reasoning: 'Identificado como venda por regex',
      },
      {
        pattern: /\b(JUROS|RENDIMENTO|RENDIMENTOS|JURO|REND|INVESTIMENTO|INVEST)\b/i,
        categoryName: 'Juros e Rendimentos',
        confidence: 100,
        reasoning: 'Identificado como juros/rendimentos por regex',
      },
      {
        pattern: /\b(PRESTADOR|prestador)\b/i,
        categoryName: 'Prestação de Serviço',
        confidence: 100,
        reasoning: 'Identificado como prestador de serviço por regex',
      },
      {
        pattern: /\b(OUTRAS\s+RECEITAS|OUTRA\s+RECEITA|RECEITA\s+DIVERSAS|RECEITA\s+EXTRA)\b/i,
        categoryName: 'Outras Receitas',
        confidence: 100,
        reasoning: 'Identificado como outras receitas por regex',
      },
    ];

    // Aplicar regras regex
    for (const rule of regexRules) {
      if (rule.pattern.test(searchText)) {
        console.log(`✅ Regex match encontrado: "${rule.pattern}" -> ${rule.categoryName}`);
        
        // Encontrar a categoria correspondente
        const category = availableCategories.find(cat => 
          cat.name.toUpperCase() === rule.categoryName.toUpperCase()
        );

        if (category) {
          console.log(`🎯 Categoria encontrada: ${category.name} (ID: ${category.id})`);
          return {
            categoryId: category.id,
            categoryName: category.name,
            confidence: rule.confidence,
            reasoning: rule.reasoning,
          };
        } else {
          console.log(`⚠️ Categoria "${rule.categoryName}" não encontrada nas categorias disponíveis`);
        }
      }
    }

    console.log(`❌ Nenhuma regra regex aplicável encontrada`);
    return null;
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