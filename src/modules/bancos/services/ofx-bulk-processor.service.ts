import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../config/prisma.service';
import { CacheService } from '../../../common/services/cache.service';
import { Readable } from 'stream';
import * as ofx from 'ofx';

export interface BulkTransactionData {
  ofxImportId: string;
  title: string;
  description: string;
  amount: number;
  type: string;
  transactionDate: Date;
  fitid: string | null;
  trntype: string;
  checknum: string | null;
  memo: string;
  name: string;
  suggestedCategoryId?: string;
  confidence?: number;
  suggestedPaymentMethodId?: string;
  paymentMethodConfidence?: number;
}

@Injectable()
export class OfxBulkProcessorService {
  private readonly logger = new Logger(OfxBulkProcessorService.name);
  
  constructor(
    private prisma: PrismaService,
    private cacheService: CacheService,
  ) {}

  /**
   * Parse OFX usando streams para arquivos grandes
   */
  async parseOfxStream(buffer: Buffer): Promise<any> {
    const startTime = Date.now();
    this.logger.log(`📊 Iniciando parse OFX via stream (${buffer.length} bytes)`);
    
    try {
      // Detectar encoding
      const ofxContent = this.detectAndDecodeFile(buffer);
      
      // Parse do arquivo OFX
      const ofxData = ofx.parse(ofxContent);
      
      if (!ofxData.OFX?.BANKMSGSRSV1?.STMTTRNRS) {
        throw new Error('Formato OFX inválido');
      }

      const stmttrnrs = ofxData.OFX.BANKMSGSRSV1.STMTTRNRS;
      const banktranlist = stmttrnrs.STMTRS.BANKTRANLIST;
      
      if (!banktranlist?.STMTTRN) {
        throw new Error('Nenhuma transação encontrada no arquivo OFX');
      }

      const transactions = Array.isArray(banktranlist.STMTTRN) 
        ? banktranlist.STMTTRN 
        : [banktranlist.STMTTRN];

      const duration = Date.now() - startTime;
      this.logger.log(`✅ Parse OFX completo em ${duration}ms - ${transactions.length} transações`);
      
      return {
        transactions,
        accountInfo: stmttrnrs.STMTRS.BANKACCTFROM || {},
        statement: stmttrnrs.STMTRS || {}
      };
      
    } catch (error) {
      this.logger.error(`❌ Erro no parse OFX:`, error);
      throw error;
    }
  }

  /**
   * Mapeamento de nomes do regex para nomes reais das categorias
   */
  private getCategoryNameMapping(): Map<string, string[]> {
    return new Map([
      // Mapeamento para categorias que REALMENTE existem no banco
      ['ALIMENTACAO', ['Compras']], // Usar "Compras" para alimentação
      ['TRANSPORTE', ['Compras']], // Usar "Compras" para transporte
      ['ENTRETENIMENTO', ['Compras']], // Usar "Compras" para entretenimento
      ['SAUDE', ['Compras']], // Usar "Compras" para saúde
      ['RENDA', ['Vendas', 'Serviços', 'Outras Receitas']], // Usar receitas existentes
      ['TRANSFERENCIA', ['Aporte Financeiro', 'Outras Receitas']], // Usar categorias de receita
      ['TARIFAS_BANCARIAS', ['Impostos']], // Usar "Impostos" para tarifas
      ['COMPRAS', ['Compras']], // Existe
      ['FOLHA', ['Folha', 'Salários']], // Existe
      ['IMPOSTOS', ['Impostos']], // Existe
      ['PARTICULAR', ['PARTICULAR']], // Existe
      ['VENDAS', ['Vendas']], // Existe
      ['PRESTACAO_SERVICO', ['Prestação de Serviço', 'Serviços']], // Existe
      ['JUROS_RENDIMENTOS', ['Juros e Rendimentos']], // Existe
      ['OUTRAS_RECEITAS', ['Outras Receitas']] // Existe
    ]);
  }

  /**
   * Converter nomes de categorias para IDs
   */
  async convertCategoryNamesToIds(transactions: BulkTransactionData[]): Promise<BulkTransactionData[]> {
    // Extrair nomes únicos de categorias que precisam ser convertidos
    const categoryNames = new Set<string>();
    transactions.forEach(tx => {
      if (tx.suggestedCategoryId && !tx.suggestedCategoryId.startsWith('cmd')) { // Se não for um ID válido (cmd = categoria)
        categoryNames.add(tx.suggestedCategoryId.toUpperCase());
      }
    });

    if (categoryNames.size === 0) {
      this.logger.log(`✅ Nenhuma categoria precisa ser convertida - já são IDs válidos`);
      return transactions; // Nada para converter
    }

    this.logger.log(`🔍 Convertendo ${categoryNames.size} nomes de categorias para IDs: ${Array.from(categoryNames).join(', ')}`);

    // Buscar todas as categorias do banco
    const allCategories = await this.prisma.financialCategory.findMany({
      select: {
        id: true,
        name: true
      }
    });

    this.logger.log(`📋 Categorias disponíveis no banco: ${allCategories.map(c => c.name).join(', ')}`);

    // Criar mapeamento inteligente
    const categoryMapping = this.getCategoryNameMapping();
    const categoryMap = new Map<string, string>();

    // Para cada nome do regex, tentar encontrar correspondência
    for (const regexName of categoryNames) {
      let found = false;
      
      // 1. Busca exata
      const exactMatch = allCategories.find(cat => 
        cat.name.toUpperCase() === regexName
      );
      
      if (exactMatch) {
        categoryMap.set(regexName, exactMatch.id);
        this.logger.log(`✅ Match exato: "${regexName}" -> "${exactMatch.name}" (${exactMatch.id})`);
        found = true;
        continue;
      }

      // 2. Busca usando mapeamento
      const possibleNames = categoryMapping.get(regexName) || [];
      for (const possibleName of possibleNames) {
        const match = allCategories.find(cat => 
          cat.name.toUpperCase() === possibleName.toUpperCase()
        );
        
        if (match) {
          categoryMap.set(regexName, match.id);
          this.logger.log(`✅ Match por mapeamento: "${regexName}" -> "${match.name}" (${match.id})`);
          found = true;
          break;
        }
      }

      // 3. Busca parcial (contém)
      if (!found) {
        const partialMatch = allCategories.find(cat => 
          cat.name.toUpperCase().includes(regexName) || 
          regexName.includes(cat.name.toUpperCase())
        );
        
        if (partialMatch) {
          categoryMap.set(regexName, partialMatch.id);
          this.logger.log(`✅ Match parcial: "${regexName}" -> "${partialMatch.name}" (${partialMatch.id})`);
          found = true;
        }
      }

      if (!found) {
        this.logger.warn(`⚠️ Categoria "${regexName}" não encontrada - será removida`);
      }
    }

    // Converter transações
    return transactions.map(tx => {
      if (tx.suggestedCategoryId && !tx.suggestedCategoryId.startsWith('cmd')) {
        const categoryId = categoryMap.get(tx.suggestedCategoryId.toUpperCase());
        
        if (categoryId) {
          return {
            ...tx,
            suggestedCategoryId: categoryId
          };
        } else {
          // Remover sugestão se categoria não foi encontrada
          return {
            ...tx,
            suggestedCategoryId: undefined,
            confidence: undefined
          };
        }
      }
      
      return tx;
    });
  }

  /**
   * Converter nomes de métodos de pagamento para IDs usando mapeamento inteligente
   */
  async convertPaymentMethodNamesToIds(transactions: BulkTransactionData[]): Promise<BulkTransactionData[]> {
    // Extrair nomes únicos de métodos de pagamento que precisam ser convertidos
    const paymentMethodNames = new Set<string>();
    transactions.forEach(tx => {
      if (tx.suggestedPaymentMethodId && !tx.suggestedPaymentMethodId.startsWith('cmd')) { // Se não for um ID válido
        paymentMethodNames.add(tx.suggestedPaymentMethodId.toUpperCase());
      }
    });

    if (paymentMethodNames.size === 0) {
      return transactions; // Nada para converter
    }

    this.logger.log(`🔍 Convertendo ${paymentMethodNames.size} nomes de métodos de pagamento para IDs: ${Array.from(paymentMethodNames).join(', ')}`);

    // Buscar todos os métodos de pagamento do banco
    const allPaymentMethods = await this.prisma.paymentMethod.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true
      }
    });

    this.logger.log(`📋 Métodos de pagamento disponíveis no banco: ${allPaymentMethods.map(pm => pm.name).join(', ')}`);

    // Criar mapeamento para métodos de pagamento
    const paymentMethodMap = new Map<string, string>();

    // Para cada nome do regex, tentar encontrar correspondência
    for (const regexName of paymentMethodNames) {
      let found = false;
      
      // 1. Busca exata
      const exactMatch = allPaymentMethods.find(pm => 
        pm.name.toUpperCase() === regexName
      );
      
      if (exactMatch) {
        paymentMethodMap.set(regexName, exactMatch.id);
        this.logger.log(`✅ Match exato método de pagamento: "${regexName}" -> "${exactMatch.name}" (${exactMatch.id})`);
        found = true;
        continue;
      }

      // 2. Busca parcial (contém)
      if (!found) {
        const partialMatch = allPaymentMethods.find(pm => 
          pm.name.toUpperCase().includes(regexName) || 
          regexName.includes(pm.name.toUpperCase())
        );
        
        if (partialMatch) {
          paymentMethodMap.set(regexName, partialMatch.id);
          this.logger.log(`✅ Match parcial método de pagamento: "${regexName}" -> "${partialMatch.name}" (${partialMatch.id})`);
          found = true;
        }
      }

      if (!found) {
        this.logger.warn(`⚠️ Método de pagamento "${regexName}" não encontrado - será removido`);
      }
    }

    // Converter transações
    return transactions.map(tx => {
      if (tx.suggestedPaymentMethodId && !tx.suggestedPaymentMethodId.startsWith('cmd')) {
        const paymentMethodId = paymentMethodMap.get(tx.suggestedPaymentMethodId.toUpperCase());
        
        if (paymentMethodId) {
          return {
            ...tx,
            suggestedPaymentMethodId: paymentMethodId
          };
        } else {
          // Remover sugestão se método de pagamento não foi encontrado
          return {
            ...tx,
            suggestedPaymentMethodId: undefined,
            paymentMethodConfidence: undefined
          };
        }
      }
      
      return tx;
    });
  }

  /**
   * Bulk insert otimizado para transações pendentes
   */
  async bulkInsertPendingTransactions(
    transactions: BulkTransactionData[],
    batchSize: number = 100 // Reduced from 500 to 100 for better performance
  ): Promise<{ total: number; batches: number; duration: number }> {
    const startTime = Date.now();
    const total = transactions.length;
    const batches = Math.ceil(total / batchSize);
    
    this.logger.log(`📊 Iniciando bulk insert otimizado: ${total} transações em ${batches} lotes de ${batchSize}`);

    try {
      // Usar cache service para conversão otimizada
      const convertedTransactions = this.cacheService.convertCategoryNamesToIds(
        this.cacheService.convertPaymentMethodNamesToIds(transactions)
      );
      
      // Processar em lotes menores para melhor performance
      for (let i = 0; i < batches; i++) {
        const start = i * batchSize;
        const end = Math.min(start + batchSize, total);
        const batch = convertedTransactions.slice(start, end);
        
        this.logger.log(`🔄 Inserindo lote ${i + 1}/${batches} (${batch.length} transações)`);
        
        // Usar createMany para bulk insert otimizado
        const insertData = batch.map(tx => ({
          ofxImportId: tx.ofxImportId,
          title: tx.title,
          description: tx.description,
          amount: tx.amount,
          type: tx.type as any, // Type assertion para enum
          transactionDate: tx.transactionDate,
          fitid: tx.fitid,
          trntype: tx.trntype,
          checknum: tx.checknum,
          memo: tx.memo,
          name: tx.name,
          suggestedCategoryId: tx.suggestedCategoryId,
          confidence: tx.confidence,
          suggestedPaymentMethodId: tx.suggestedPaymentMethodId,
          paymentMethodConfidence: tx.paymentMethodConfidence,
        }));

        await this.prisma.ofxPendingTransaction.createMany({
          data: insertData,
          skipDuplicates: true, // Otimização para evitar erros de duplicação
        });

        // Pausa menor entre lotes
        if (i < batches - 1) {
          await new Promise(resolve => setTimeout(resolve, 5)); // Reduced from 10 to 5ms
        }
      }

      const duration = Date.now() - startTime;
      this.logger.log(`✅ Bulk insert completo em ${duration}ms`);
      
      return { total, batches, duration };
      
    } catch (error) {
      this.logger.error(`❌ Erro no bulk insert:`, error);
      throw error;
    }
  }

  /**
   * Update em lote do progresso da importação
   */
  async updateImportProgress(
    importId: string,
    totalTransactions: number,
    processedTransactions: number,
    status?: string,
    errorMessage?: string
  ): Promise<void> {
    try {
      await this.prisma.ofxImport.update({
        where: { id: importId },
        data: {
          totalTransactions,
          processedTransactions,
          ...(status && { status: status as any }),
          ...(errorMessage && { errorMessage }),
        },
      });
    } catch (error) {
      this.logger.error(`❌ Erro ao atualizar progresso:`, error);
      // Não propagar erro para não quebrar o processamento
    }
  }

  /**
   * Bulk update para associar categorias sugeridas
   */
  async bulkUpdateCategorySuggestions(
    updates: Array<{
      id: string;
      categoryId: string;
      confidence: number;
    }>
  ): Promise<number> {
    if (updates.length === 0) return 0;

    const startTime = Date.now();
    this.logger.log(`📊 Atualizando ${updates.length} sugestões de categoria`);

    try {
      // Usar transação para garantir consistência
      const result = await this.prisma.$transaction(
        updates.map(update => 
          this.prisma.ofxPendingTransaction.update({
            where: { id: update.id },
            data: {
              suggestedCategoryId: update.categoryId,
              confidence: update.confidence,
            },
          })
        )
      );

      const duration = Date.now() - startTime;
      this.logger.log(`✅ Categorias atualizadas em ${duration}ms`);
      
      return result.length;
      
    } catch (error) {
      this.logger.error(`❌ Erro ao atualizar categorias:`, error);
      throw error;
    }
  }

  /**
   * Bulk update para associar métodos de pagamento sugeridos
   */
  async bulkUpdatePaymentMethodSuggestions(
    updates: Array<{
      id: string;
      paymentMethodId: string;
      confidence: number;
    }>
  ): Promise<number> {
    if (updates.length === 0) return 0;

    const startTime = Date.now();
    this.logger.log(`📊 Atualizando ${updates.length} sugestões de método de pagamento`);

    try {
      const result = await this.prisma.$transaction(
        updates.map(update => 
          this.prisma.ofxPendingTransaction.update({
            where: { id: update.id },
            data: {
              suggestedPaymentMethodId: update.paymentMethodId,
              paymentMethodConfidence: update.confidence,
            },
          })
        )
      );

      const duration = Date.now() - startTime;
      this.logger.log(`✅ Métodos de pagamento atualizados em ${duration}ms`);
      
      return result.length;
      
    } catch (error) {
      this.logger.error(`❌ Erro ao atualizar métodos de pagamento:`, error);
      throw error;
    }
  }

  /**
   * Detectar encoding otimizado
   */
  private detectAndDecodeFile(buffer: Buffer): string {
    const encodings: BufferEncoding[] = ['utf-8', 'latin1', 'ascii'];
    
    for (const encoding of encodings) {
      try {
        const content = buffer.toString(encoding);
        
        // Verificação otimizada
        if (!content.includes('\uFFFD') && content.includes('<OFX>')) {
          this.logger.log(`📝 Arquivo decodificado com encoding: ${encoding}`);
          return content;
        }
      } catch {
        continue;
      }
    }
    
    this.logger.log('📝 Usando latin1 como fallback');
    return buffer.toString('latin1');
  }

  /**
   * Métricas de performance
   */
  async getPerformanceMetrics(importId: string) {
    const importRecord = await this.prisma.ofxImport.findUnique({
      where: { id: importId },
      include: {
        pendingTransactions: {
          select: {
            id: true,
            suggestedCategoryId: true,
            suggestedPaymentMethodId: true,
          },
        },
      },
    });

    if (!importRecord) return null;

    const totalTransactions = importRecord.totalTransactions || 0;
    const processedTransactions = importRecord.processedTransactions || 0;
    const pendingTransactions = importRecord.pendingTransactions.length;
    const categorizedTransactions = importRecord.pendingTransactions.filter(
      tx => tx.suggestedCategoryId
    ).length;
    const paymentMethodSuggestions = importRecord.pendingTransactions.filter(
      tx => tx.suggestedPaymentMethodId
    ).length;

    return {
      importId,
      totalTransactions,
      processedTransactions,
      pendingTransactions,
      categorizedTransactions,
      paymentMethodSuggestions,
      progress: totalTransactions > 0 ? (processedTransactions / totalTransactions) * 100 : 0,
      categorizationRate: pendingTransactions > 0 ? (categorizedTransactions / pendingTransactions) * 100 : 0,
      paymentMethodRate: pendingTransactions > 0 ? (paymentMethodSuggestions / pendingTransactions) * 100 : 0,
      status: importRecord.status,
      importDate: importRecord.importDate,
    };
  }
}