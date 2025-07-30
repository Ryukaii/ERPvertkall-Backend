import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '../../config/config.service';
import { PrismaService } from '../../config/prisma.service';
import OpenAI from 'openai';
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
  private openai: OpenAI;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    const apiKey = this.configService.openaiApiKey;
    if (!apiKey) {
      this.logger.warn('OPENAI_API_KEY não configurada. Categorização automática desabilitada.');
      return;
    }

    this.openai = new OpenAI({
      apiKey,
    });
  }

  async suggestCategoryForTransaction(
    transactionTitle: string,
    transactionDescription: string,
    amount: number,
    type: FinancialTransactionType,
  ): Promise<CategorySuggestion | null> {
    if (!this.openai) {
      this.logger.warn('OpenAI não configurado. Retornando null para sugestão de categoria.');
      return null;
    }

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

      // Preparar contexto para o ChatGPT
      const categoriesList = availableCategories
        .map(cat => `- ${cat.name}${cat.description ? ` (${cat.description})` : ''}`)
        .join('\n');

      const prompt = this.buildPrompt(
        transactionTitle,
        transactionDescription,
        amount,
        type,
        categoriesList,
      );

      // ===== DEBUG: Log resumido da transação =====
      console.log(`\n🤖 === CATEGORIZAÇÃO: "${transactionTitle}" ===`);
      console.log(`📊 Valor: R$ ${(amount / 100).toFixed(2)} | Tipo: ${type}`);
      console.log(`📋 Categorias disponíveis: ${availableCategories.length}`);

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4.1-nano-2025-04-14',
        messages: [
          {
            role: 'system',
            content: `Você é um assistente especializado em categorização financeira. 
            Sua tarefa é analisar transações bancárias e sugerir a categoria mais apropriada 
            baseada no título, descrição e valor da transação. 
            
            Regras importantes:
            1. Analise cuidadosamente o contexto da transação
            2. Considere o valor da transação para determinar a categoria
            3. Para valores negativos (despesas), use categorias PAYABLE
            4. Para valores positivos (receitas), use categorias RECEIVABLE
            5. Se não houver uma categoria adequada, sugira a mais próxima
            6. Forneça uma explicação clara do seu raciocínio
            7. Atribua uma confiança de 0 a 100 baseada na certeza da categorização
            
            Regras específicas para categorização:
            - Transações com "VT" (Vale Transporte) ou "VR" (Vale Refeição) devem ser categorizadas como "Folha"
            - Exemplos: "Pagamento VT da Semana", "Pagamento VR", "VT KAROLYNA", "VR funcionário"
            - Transações de salários, pagamentos de funcionários, VT, VR = categoria "Folha"
            - Transações de energia elétrica = categoria "Energia Elétrica"
            - Transações de telefone/internet = categoria "Telefone/Internet"
            - Transações de aluguel = categoria "Aluguel"
            - Transações de impostos = categoria "Impostos"
            - Transações de manutenção = categoria "Manutenção"
            - Transações de marketing = categoria "Marketing"
            - Transações de material de escritório = categoria "Material de Escritório"
            - Transações de vendas = categoria "Vendas"
            - Transações de prestação de serviços = categoria "Prestação de Serviços"
            - Transações de juros/rendimentos = categoria "Juros e Rendimentos"`,
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3, // Baixa temperatura para respostas mais consistentes
        max_tokens: 500,
      });

      const response = completion.choices[0]?.message?.content;
      if (!response) {
        this.logger.error('Resposta vazia do ChatGPT');
        return null;
      }



      // Parsear a resposta do ChatGPT
      const suggestion = this.parseChatGptResponse(response, availableCategories);
      
      // ===== DEBUG: Log do resultado =====
      if (suggestion) {
        console.log(`✅ RESULTADO: ${suggestion.categoryName} (${suggestion.confidence}%)`);
        if (suggestion.confidence >= 70) {
          console.log(`🎯 APLICADO AUTOMATICAMENTE`);
        } else {
          console.log(`⚠️ PENDENTE (confiança < 70%)`);
        }
      } else {
        console.log(`❌ FALHA: Nenhuma sugestão gerada`);
      }
      console.log(`🤖 === FIM CATEGORIZAÇÃO ===\n`);
      
      this.logger.log(`Sugestão de categoria para "${transactionTitle}": ${suggestion?.categoryName} (confiança: ${suggestion?.confidence}%)`);
      
      return suggestion;

    } catch (error) {
      this.logger.error('Erro ao obter sugestão de categoria do ChatGPT:', error);
      return null;
    }
  }

  private buildPrompt(
    title: string,
    description: string,
    amount: number,
    type: FinancialTransactionType,
    categoriesList: string,
  ): string {
    const amountFormatted = (amount / 100).toFixed(2);
    
    // Mapear tipo para texto descritivo
    let typeText = 'despesa';
    if (type === 'PAYABLE' || type === 'DEBIT') {
      typeText = 'despesa';
    } else if (type === 'RECEIVABLE' || type === 'CREDIT') {
      typeText = 'receita';
    }
    
    const prompt = `Analise a seguinte transação bancária e sugira a categoria mais apropriada:

**Transação:**
- Título: "${title}"
- Descrição: "${description || 'N/A'}"
- Valor: R$ ${amountFormatted} (${typeText})
- Tipo: ${type}

**Categorias disponíveis:**
${categoriesList}

**Regras específicas de categorização:**
- VT (Vale Transporte) ou VR (Vale Refeição) = "Folha"
- Exemplos: "Pagamento VT da Semana KAROLYNA", "Pagamento VR", "VT funcionário"
- Salários, pagamentos de funcionários = "Folha"
- Energia elétrica = "Energia Elétrica"
- Telefone/internet = "Telefone/Internet"
- Aluguel = "Aluguel"
- Impostos = "Impostos"
- Manutenção = "Manutenção"
- Marketing = "Marketing"
- Material de escritório = "Material de Escritório"
- Vendas = "Vendas"
- Prestação de serviços = "Prestação de Serviços"
- Juros/rendimentos = "Juros e Rendimentos"

**Instruções:**
1. Analise o contexto da transação
2. Escolha a categoria mais apropriada da lista
3. Atribua um nível de confiança (0-100)

**Formato da resposta:**
Categoria: [nome da categoria]
Confiança: [0-100]`;

    return prompt;
  }

  private parseChatGptResponse(
    response: string,
    availableCategories: Array<{ id: string; name: string; description: string | null }>,
  ): CategorySuggestion | null {
    try {
      // Extrair informações da resposta usando regex
      const categoryMatch = response.match(/Categoria:\s*(.+)/i);
      const confidenceMatch = response.match(/Confiança:\s*(\d+)/i);

      if (!categoryMatch || !confidenceMatch) {
        this.logger.warn('Formato de resposta do ChatGPT inválido:', response);
        return null;
      }

      const suggestedCategoryName = categoryMatch[1].trim();
      const confidence = parseInt(confidenceMatch[1], 10);

      // Encontrar a categoria correspondente na lista disponível
      const matchedCategory = availableCategories.find(cat =>
        cat.name.toLowerCase() === suggestedCategoryName.toLowerCase()
      );

      if (!matchedCategory) {
        this.logger.warn(`Categoria sugerida "${suggestedCategoryName}" não encontrada na lista disponível`);
        return null;
      }

      const result = {
        categoryId: matchedCategory.id,
        categoryName: matchedCategory.name,
        confidence: Math.min(Math.max(confidence, 0), 100), // Garantir que está entre 0-100
        reasoning: '', // Removido reasoning
      };

      return result;

    } catch (error) {
      console.log('❌ Erro durante parsing:', error);
      this.logger.error('Erro ao parsear resposta do ChatGPT:', error);
      return null;
    }
  }

  async categorizeTransaction(
    transactionId: string,
    categoryId: string,
    confidence: number,
    reasoning: string,
  ): Promise<void> {
          await this.prisma.financialTransaction.update({
        where: { id: transactionId },
        data: {
          categoryId,
          // Adicionar metadados da categorização AI (pode ser expandido no futuro)
          description: reasoning ? `${reasoning} (Categorização AI - ${confidence}% confiança)` : undefined,
        },
      });

    this.logger.log(`Transação ${transactionId} categorizada com categoria ID ${categoryId} (confiança: ${confidence}%)`);
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

  // Novo método específico para transações OFX pendentes
  async suggestCategoryForOfxTransaction(
    pendingTransactionId: string,
  ): Promise<CategorySuggestion | null> {
    if (!this.openai) {
      this.logger.warn('OpenAI não configurado. Retornando null para sugestão de categoria.');
      return null;
    }

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