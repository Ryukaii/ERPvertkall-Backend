import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service';
import { ImportOfxDto } from './dto/import-ofx.dto';
import { OfxImport, OfxImportStatus, FinancialTransactionType, FinancialTransactionStatus } from '@prisma/client';
import { AiCategorizationService } from './ai-categorization.service';
import { PaymentMethodSuggestionService } from './payment-method-suggestion.service';
import { OfxClusterManager } from './workers/ofx-cluster-manager';
import { OfxBulkProcessorService } from './services/ofx-bulk-processor.service';

@Injectable()
export class OfxImportService {
  private readonly logger = new Logger(OfxImportService.name);

  constructor(
    private prisma: PrismaService,
    private aiCategorizationService: AiCategorizationService,
    private paymentMethodSuggestionService: PaymentMethodSuggestionService,
    private clusterManager: OfxClusterManager,
    private bulkProcessor: OfxBulkProcessorService,
  ) {}

  async createImport(importOfxDto: ImportOfxDto): Promise<OfxImport> {
    // Verificar se o banco existe
    const bank = await this.prisma.bank.findFirst({
      where: {
        id: importOfxDto.bankId,
        isActive: true,
      },
    });

    if (!bank) {
      throw new NotFoundException('Banco não encontrado');
    }

    return this.prisma.ofxImport.create({
      data: {
        fileName: importOfxDto.fileName,
        bankId: importOfxDto.bankId,
        status: 'PENDING', // Iniciar como PENDING
      },
    });
  }

  async processOfxFileAsync(
    fileBuffer: Buffer,
    importId: string,
    userId: string,
  ): Promise<void> {
    // Executar processamento otimizado em background
    setImmediate(async () => {
      const startTime = Date.now();
      try {
        this.logger.log(`🚀 === INICIANDO PROCESSAMENTO OTIMIZADO PARA IMPORT ${importId} ===`);
        
        // Atualizar status para PROCESSING
        await this.bulkProcessor.updateImportProgress(importId, 0, 0, 'PROCESSING');

        // Parse otimizado via streams
        const ofxData = await this.bulkProcessor.parseOfxStream(fileBuffer);
        const totalTransactions = ofxData.transactions.length;
        
        this.logger.log(`📊 Total de ${totalTransactions} transações encontradas`);
        
        // Atualizar total de transações
        await this.bulkProcessor.updateImportProgress(importId, totalTransactions, 0);

        // Processamento paralelo via cluster
        const workerResults = await this.clusterManager.processTransactionsInParallel(
          ofxData.transactions,
          importId,
          userId
        );

        // Consolidar resultados de todos os workers
        const allProcessedTransactions = workerResults.flatMap(result => 
          result.categorizedTransactions
        );
        
        const totalProcessed = allProcessedTransactions.length;
        const totalErrors = workerResults.reduce((sum, result) => sum + result.errors.length, 0);
        
        this.logger.log(`📊 Processamento paralelo completo: ${totalProcessed}/${totalTransactions} transações`);
        
        if (allProcessedTransactions.length > 0) {
          // Bulk insert otimizado com regex já aplicado
          this.logger.log(`💾 Iniciando bulk insert de ${allProcessedTransactions.length} transações`);
          
          // Contar quantas foram categorizadas via regex
          const categorizedByRegex = allProcessedTransactions.filter(tx => tx.suggestedCategory).length;
          this.logger.log(`🎯 ${categorizedByRegex}/${allProcessedTransactions.length} transações categorizadas via regex`);
          
          const bulkData = allProcessedTransactions.map(tx => ({
            ofxImportId: importId,
            title: tx.title,
            description: tx.description,
            amount: tx.amount,
            type: tx.type,
            transactionDate: tx.transactionDate,
            fitid: tx.fitid,
            trntype: tx.trntype,
            checknum: tx.checknum,
            memo: tx.memo,
            name: tx.name,
            ...(tx.suggestedCategory && {
              suggestedCategoryId: tx.suggestedCategory,
              confidence: tx.categoryConfidence || 80
            }),
            ...(tx.suggestedPaymentMethod && {
              suggestedPaymentMethodId: tx.suggestedPaymentMethod,
              paymentMethodConfidence: tx.paymentMethodConfidence || 80
            })
          }));
          
          // Converter nomes para IDs antes do bulk insert
          const processedBulkData = await this.bulkProcessor.convertCategoryNamesToIds(bulkData);
          const finalBulkData = await this.bulkProcessor.convertPaymentMethodNamesToIds(processedBulkData);
          
          await this.bulkProcessor.bulkInsertPendingTransactions(finalBulkData);
          
          // Log detalhado das categorizações e métodos de pagamento
          const categorizedTransactions = allProcessedTransactions.filter(tx => tx.suggestedCategory);
          const paymentMethodTransactions = allProcessedTransactions.filter(tx => tx.suggestedPaymentMethod);
          
          if (categorizedTransactions.length > 0) {
            this.logger.log(`🎯 === CATEGORIZATIONS VIA REGEX ===`);
            categorizedTransactions.forEach(tx => {
              this.logger.log(`📝 "${tx.description}" -> ${tx.suggestedCategory} (${tx.categoryConfidence}%)`);
            });
          }
          
          if (paymentMethodTransactions.length > 0) {
            this.logger.log(`💳 === PAYMENT METHODS VIA REGEX ===`);
            paymentMethodTransactions.forEach(tx => {
              this.logger.log(`💳 "${tx.description}" -> ${tx.suggestedPaymentMethod} (${tx.paymentMethodConfidence}%)`);
            });
          }
          
          // Console de debug final
          this.logger.log(`📊 === RESUMO DO PROCESSAMENTO ===`);
          this.logger.log(`📊 Total de transações: ${totalProcessed}`);
          this.logger.log(`🎯 Categorias encontradas via regex: ${categorizedTransactions.length}`);
          this.logger.log(`💳 Métodos de pagamento encontrados via regex: ${paymentMethodTransactions.length}`);
          this.logger.log(`📊 Taxa de categorização: ${Math.round((categorizedTransactions.length / totalProcessed) * 100)}%`);
          this.logger.log(`📊 Taxa de métodos de pagamento: ${Math.round((paymentMethodTransactions.length / totalProcessed) * 100)}%`);
        }

        // Status final
        const finalStatus = totalErrors === 0 ? 'PENDING_REVIEW' : 'FAILED';
        const errorMessage = totalErrors > 0 ? `${totalErrors} erros durante o processamento` : null;
        
        await this.bulkProcessor.updateImportProgress(
          importId, 
          totalTransactions, 
          totalProcessed, 
          finalStatus,
          errorMessage || undefined
        );

        const duration = Date.now() - startTime;
        this.logger.log(`✅ === PROCESSAMENTO OTIMIZADO FINALIZADO ===`);
        this.logger.log(`📊 Import: ${importId}`);
        this.logger.log(`📊 Status: ${finalStatus}`);
        this.logger.log(`📊 Transações: ${totalProcessed}/${totalTransactions}`);
        this.logger.log(`📊 Erros: ${totalErrors}`);
        this.logger.log(`📊 Duração: ${duration}ms`);
        this.logger.log(`📊 Throughput: ${Math.round(totalTransactions * 1000 / duration)} transações/segundo`);

      } catch (error) {
        this.logger.error(`❌ === ERRO NO PROCESSAMENTO OTIMIZADO ===`);
        this.logger.error(`Import: ${importId}`);
        this.logger.error(error);
        
        // Atualizar status para FAILED
        await this.bulkProcessor.updateImportProgress(
          importId, 
          0, 
          0, 
          'FAILED',
          error.message
        );
      }
    });
  }

  // Método mantido para compatibilidade com métodos existentes
  private detectAndDecodeFile(buffer: Buffer): string {
    const encodings: BufferEncoding[] = ['utf-8', 'latin1', 'ascii'];
    
    for (const encoding of encodings) {
      try {
        const content = buffer.toString(encoding);
        if (!content.includes('\uFFFD') && content.includes('<OFX>')) {
          this.logger.log(`Arquivo decodificado usando encoding: ${encoding}`);
          return content;
        }
      } catch {
        continue;
      }
    }
    
    this.logger.log('Usando latin1 como fallback para decodificação');
    return buffer.toString('latin1');
  }

  // Método legado mantido para compatibilidade (não usado no novo fluxo otimizado)
  async processOfxFile(ofxContent: string, importId: string, userId: string): Promise<OfxImport> {
    this.logger.warn(`⚠️ Usando método legado processOfxFile para ${importId}`);
    
    try {
      const buffer = Buffer.from(ofxContent, 'utf8');
      const ofxData = await this.bulkProcessor.parseOfxStream(buffer);
      
      // Redirecionar para o processamento otimizado
      const workerResults = await this.clusterManager.processTransactionsInParallel(
        ofxData.transactions,
        importId,
        userId
      );

      const totalProcessed = workerResults.reduce((sum, result) => sum + result.processedCount, 0);
      const totalErrors = workerResults.reduce((sum, result) => sum + result.errors.length, 0);
      
      const status = totalErrors === 0 ? 'PENDING_REVIEW' : 'FAILED';
      const errorMessage = totalErrors > 0 ? `${totalErrors} erros durante processamento` : null;

      return this.prisma.ofxImport.update({
        where: { id: importId },
        data: {
          status,
          totalTransactions: ofxData.transactions.length,
          processedTransactions: totalProcessed,
          errorMessage,
        },
      });

    } catch (error) {
      this.logger.error(`❌ Erro no processamento legado:`, error);
      
      await this.prisma.ofxImport.update({
        where: { id: importId },
        data: {
          status: 'FAILED',
          errorMessage: error.message,
        },
      });

      throw error;
    }
  }

  private async processTransaction(
    ofxTransaction: any, 
    importId: string, 
    userId: string
  ): Promise<void> {
    try {
      // Extrair campos com valores padrão para campos faltantes
      const {
        TRNTYPE = 'OTHER',
        DTPOSTED,
        TRNAMT = '0',
        FITID = null,
        MEMO = '',
        NAME = '',
        CHECKNUM = null,
      } = ofxTransaction;

      // Log para debug - mostrar dados originais recebidos
      console.log('Processando transação OFX:', {
        TRNTYPE,
        DTPOSTED,
        TRNAMT,
        MEMO: MEMO ? `"${MEMO}"` : 'undefined',
        NAME: NAME ? `"${NAME}"` : 'undefined',
        FITID,
        CHECKNUM,
      });

      // Validar campos obrigatórios mínimos
      if (!DTPOSTED) {
        console.warn('⚠️ Transação pulada: DTPOSTED ausente');
        return;
      }

      if (!TRNAMT || TRNAMT === '0') {
        console.warn('⚠️ Transação pulada: TRNAMT ausente ou zero');
        return;
      }

      // Função para corrigir problemas de encoding de forma mais simples e eficaz
      const fixEncoding = (text: string): string => {
        if (!text) return text;
        
        // Primeiro, tentar correções básicas de caracteres corrompidos comuns
        let fixedText = text
          // Correções específicas para caracteres corrompidos mais comuns
          .replace(/Ã¡/g, 'á')
          .replace(/Ã©/g, 'é')
          .replace(/Ã­/g, 'í')
          .replace(/Ã³/g, 'ó')
          .replace(/Ãº/g, 'ú')
          .replace(/Ã£/g, 'ã')
          .replace(/Ãµ/g, 'õ')
          .replace(/Ã§/g, 'ç')
          .replace(/Ã/g, 'Á')
          .replace(/Ã‰/g, 'É')
          .replace(/Ã/g, 'Í')
          .replace(/Ã"/g, 'Ó')
          .replace(/Ãš/g, 'Ú')
          .replace(/Ã‡/g, 'Ç')
          .replace(/Ã‚/g, 'Â')
          .replace(/Ãª/g, 'ê')
          .replace(/Ã´/g, 'ô')
          .replace(/Ã /g, 'à')
          // Correções para padrões específicos de bancos
          .replace(/DÃ‰B/g, 'DÉB')
          .replace(/CRÃ‰D/g, 'CRÉD')
          .replace(/TRANSFERÃŠNCIA/g, 'TRANSFERÊNCIA')
          .replace(/DEPÃ"SITO/g, 'DEPÓSITO')
          .replace(/SÃƑQUE/g, 'SAQUE')
          .replace(/Ã"RGÃOS/g, 'ÓRGÃOS')
          .replace(/PREVIDÃŠNCIA/g, 'PREVIDÊNCIA')
          .replace(/CONVÃŠNIO/g, 'CONVÊNIO')
          .replace(/EMPRÃ‰STIMO/g, 'EMPRÉSTIMO')
          .replace(/APLICAÃ‡ÃƒO/g, 'APLICAÇÃO')
          .replace(/RESGATEAPLICAÃ‡ÃƒO/g, 'RESGATE APLICAÇÃO')
          // Correções específicas para o OFX fornecido
          .replace(/DEBITO TRANSFERENCIA PIX/g, 'DÉBITO TRANSFERÊNCIA PIX')
          .replace(/CREDITO RECEBIMENTO DE PIX/g, 'CRÉDITO RECEBIMENTO DE PIX')
          .replace(/TRANSFERENCIA ENTRE CONTAS/g, 'TRANSFERÊNCIA ENTRE CONTAS')
          .replace(/DEBITO FATURA- CARTAO VISA/g, 'DÉBITO FATURA - CARTÃO VISA')
          .replace(/DEBITO TARIFA DE COBRANCA/g, 'DÉBITO TARIFA DE COBRANÇA')
          .replace(/DEBITO CUSTAS GRAVACAO ELETRONICA/g, 'DÉBITO CUSTAS GRAVAÇÃO ELETRÔNICA')
          .replace(/LIQUIDACAO DE PARCELA DE EMPRESTIMO/g, 'LIQUIDAÇÃO DE PARCELA DE EMPRÉSTIMO')
          .replace(/DÉBITO TARIFA DE COBRANÇA INSTRUÇÕES/g, 'DÉBITO TARIFA DE COBRANÇA INSTRUÇÕES');

        // Log para debug quando houver correções
        if (fixedText !== text) {
          console.log(`Encoding corrigido: "${text}" -> "${fixedText}"`);
        }
        
        return fixedText;
      };

      // Determinar tipo da transação baseado no TRNTYPE e valor
      const amount = parseFloat(TRNAMT);
      
      // Validar se o valor é um número válido
      if (isNaN(amount)) {
        console.warn(`⚠️ Transação pulada: TRNAMT inválido "${TRNAMT}"`);
        return;
      }

      const amountInCents = Math.round(Math.abs(amount) * 100);
      
      // Mapear TRNTYPE do OFX para os tipos do sistema
      let type: FinancialTransactionType;
      
      // Primeiro, verificar se é crédito ou débito baseado no TRNTYPE
      const creditTypes = ['CREDIT', 'DEP', 'DIRECTDEP', 'INT', 'DIV'];
      const debitTypes = ['DEBIT', 'ATM', 'POS', 'FEE', 'SRVCHG', 'CHECK', 'PAYMENT', 'DIRECTDEBIT', 'REPEATPMT'];
      
      if (creditTypes.includes(TRNTYPE)) {
        type = FinancialTransactionType.CREDIT;
      } else if (debitTypes.includes(TRNTYPE)) {
        type = FinancialTransactionType.DEBIT;
      } else {
        // Fallback: usar valor para determinar tipo (lógica anterior)
        type = amount > 0 ? FinancialTransactionType.CREDIT : FinancialTransactionType.DEBIT;
      }
      
      console.log(`Tipo determinado: TRNTYPE="${TRNTYPE}", Valor=${amount}, Tipo final="${type}"`);

      // Converter data do OFX com tratamento de erro
      let transactionDate: Date;
      try {
        transactionDate = this.parseOfxDate(DTPOSTED);
      } catch (error) {
        console.warn(`⚠️ Transação pulada: DTPOSTED inválido "${DTPOSTED}"`);
        return;
      }

      // Corrigir encoding dos campos de texto
      const fixedMemo = fixEncoding(MEMO || '');
      const fixedName = fixEncoding(NAME || '');
      
      // Criar título baseado no tipo de transação
      const title = this.generateTransactionTitle(TRNTYPE, fixedMemo, CHECKNUM);



      // Verificar se título e descrição ficariam iguais
      let description = fixedName || fixedMemo || `Transação OFX - ${TRNTYPE}`;
      
      // Se o título e a descrição forem iguais, usar uma descrição mais genérica
      if (title === description) {
        console.log(`🔄 Título e descrição iguais detectados: "${title}"`);
        
        if (fixedName && fixedMemo) {
          // Se temos tanto NAME quanto MEMO, usar o que for diferente do título
          if (fixedName !== title) {
            description = fixedName;
            console.log(`   📝 Usando NAME como descrição: "${description}"`);
          } else if (fixedMemo !== title) {
            description = fixedMemo;
            console.log(`   📝 Usando MEMO como descrição: "${description}"`);
          } else {
            // Se ambos são iguais ao título, usar uma descrição genérica
            description = `Transação ${TRNTYPE}`;
            console.log(`   📝 Usando descrição genérica: "${description}"`);
          }
        } else if (fixedName && fixedName !== title) {
          // Se temos apenas NAME e é diferente do título
          description = fixedName;
          console.log(`   📝 Usando NAME como descrição: "${description}"`);
        } else if (fixedMemo && fixedMemo !== title) {
          // Se temos apenas MEMO e é diferente do título
          description = fixedMemo;
          console.log(`   📝 Usando MEMO como descrição: "${description}"`);
        } else {
          // Se não temos alternativas ou todas são iguais, usar uma descrição genérica
          description = `Transação ${TRNTYPE}`;
          console.log(`   📝 Usando descrição genérica: "${description}"`);
        }
      }

      // Criar nova transação pendente
      const pendingTransaction = await this.prisma.ofxPendingTransaction.create({
        data: {
          ofxImportId: importId,
          title,
          description,
          amount: amountInCents,
          type,
          transactionDate,
          fitid: FITID,
          trntype: TRNTYPE,
          checknum: CHECKNUM,
          memo: fixedMemo,
          name: fixedName,
        },
      });

      console.log(`✅ Transação pendente criada: ${pendingTransaction.id}`);

      // Tentar categorização automática com regex
      console.log('\n🤖 === DEBUG OFX - INICIANDO CATEGORIZAÇÃO ===');
      console.log(`📊 Transação pendente criada: ${pendingTransaction.id}`);
      console.log(`📝 Dados para categorização:`);
      console.log(`   Título: "${title}"`);
      console.log(`   Descrição: "${fixedName || fixedMemo || ''}"`);
      console.log(`   Valor: ${amountInCents} centavos`);
      console.log(`   Tipo: ${type}`);
      
      try {
        const categorySuggestion = await this.aiCategorizationService.suggestCategoryForTransaction(
          title,
          fixedName || fixedMemo || '',
          amountInCents,
          type,
        );

        console.log('\n📋 Resultado da categorização:');
        if (categorySuggestion) {
          console.log(`   ✅ Sugestão recebida:`);
          console.log(`      Categoria: ${categorySuggestion.categoryName}`);
          console.log(`      Confiança: ${categorySuggestion.confidence}%`);
          
          // Atualizar a transação pendente com a sugestão
          await this.aiCategorizationService.updateOfxPendingTransactionCategory(
            pendingTransaction.id,
            categorySuggestion.categoryId,
            categorySuggestion.confidence,
          );
          
          console.log(`   💾 Sugestão salva na transação pendente`);
        } else {
          console.log(`   ❌ Nenhuma sugestão recebida`);
        }
      } catch (error) {
        // Log do erro mas não falhar a importação
        console.error('❌ Erro na categorização automática:', error);
        console.log('⚠️ Transação será importada sem categorização automática');
      }
      
      console.log('🤖 === FIM DEBUG OFX CATEGORIZAÇÃO ===\n');

      // Tentar sugestão de método de pagamento automática com regex
      console.log('\n💳 === DEBUG OFX - INICIANDO SUGESTÃO DE MÉTODO DE PAGAMENTO ===');
      console.log(`📊 Transação pendente: ${pendingTransaction.id}`);
      console.log(`📝 Dados para sugestão de método de pagamento:`);
      console.log(`   Título: "${title}"`);
      console.log(`   Descrição: "${fixedName || fixedMemo || ''}"`);
      console.log(`   Valor: ${amountInCents} centavos`);
      console.log(`   Tipo: ${type}`);
      
      try {
        const paymentMethodSuggestion = await this.paymentMethodSuggestionService.suggestPaymentMethodForTransaction(
          title,
          fixedName || fixedMemo || '',
          amountInCents,
          type,
        );

        console.log('\n💳 Resultado da sugestão de método de pagamento:');
        if (paymentMethodSuggestion) {
          console.log(`   ✅ Sugestão recebida:`);
          console.log(`      Método: ${paymentMethodSuggestion.paymentMethodName}`);
          console.log(`      Confiança: ${paymentMethodSuggestion.confidence}%`);
          
          // Atualizar a transação pendente com a sugestão
          await this.paymentMethodSuggestionService.updateOfxPendingTransactionPaymentMethod(
            pendingTransaction.id,
            paymentMethodSuggestion.paymentMethodId,
            paymentMethodSuggestion.confidence,
          );
          
          console.log(`   💾 Sugestão salva na transação pendente`);
        } else {
          console.log(`   ❌ Nenhuma sugestão recebida`);
        }
      } catch (error) {
        // Log do erro mas não falhar a importação
        console.error('❌ Erro na sugestão de método de pagamento automática:', error);
        console.log('⚠️ Transação será importada sem sugestão de método de pagamento automática');
      }
      
      console.log('💳 === FIM DEBUG OFX SUGESTÃO DE MÉTODO DE PAGAMENTO ===\n');

    } catch (error) {
      // Log do erro mas não falhar a importação completa
      console.error('❌ Erro ao processar transação OFX:', error);
      console.error('Dados da transação:', ofxTransaction);
      console.log('⚠️ Transação será pulada devido ao erro');
    }
  }

  private parseOfxDate(dateString: string): Date {
    if (!dateString || dateString.length < 8) {
      throw new Error(`Formato de data OFX inválido: ${dateString}`);
    }

    try {
      // Formato OFX padrão: YYYYMMDDHHMMSS ou YYYYMMDD
      const year = parseInt(dateString.substring(0, 4));
      const month = parseInt(dateString.substring(4, 6)) - 1; // Mês é 0-indexed
      const day = parseInt(dateString.substring(6, 8));
      
      // Validar se os valores são válidos
      if (isNaN(year) || isNaN(month) || isNaN(day)) {
        throw new Error(`Valores de data inválidos: year=${year}, month=${month}, day=${day}`);
      }

      if (year < 1900 || year > 2100) {
        throw new Error(`Ano fora do range válido: ${year}`);
      }

      if (month < 0 || month > 11) {
        throw new Error(`Mês inválido: ${month + 1}`);
      }

      if (day < 1 || day > 31) {
        throw new Error(`Dia inválido: ${day}`);
      }

      let hour = 0;
      let minute = 0;
      let second = 0;

      // Se tem informações de hora (formato YYYYMMDDHHMMSS)
      if (dateString.length >= 14) {
        hour = parseInt(dateString.substring(8, 10));
        minute = parseInt(dateString.substring(10, 12));
        second = parseInt(dateString.substring(12, 14));

        // Validar hora, minuto e segundo
        if (isNaN(hour) || hour < 0 || hour > 23) {
          console.warn(`Hora inválida: ${hour}, usando 0`);
          hour = 0;
        }

        if (isNaN(minute) || minute < 0 || minute > 59) {
          console.warn(`Minuto inválido: ${minute}, usando 0`);
          minute = 0;
        }

        if (isNaN(second) || second < 0 || second > 59) {
          console.warn(`Segundo inválido: ${second}, usando 0`);
          second = 0;
        }
      }

      const date = new Date(year, month, day, hour, minute, second);
      
      // Validar se a data criada é válida
      if (isNaN(date.getTime())) {
        throw new Error(`Data inválida criada: ${dateString}`);
      }

      return date;

    } catch (error) {
      throw new Error(`Erro ao processar data OFX "${dateString}": ${error.message}`);
    }
  }

  private generateTransactionTitle(trntype: string, memo: string, checknum: string): string {
    // Validar e limpar parâmetros
    const cleanMemo = memo ? memo.trim() : '';
    const cleanChecknum = checknum ? checknum.trim() : '';
    const cleanTrntype = trntype ? trntype.trim() : 'OTHER';

    // Usar memo corrigido se disponível e não vazio
    if (cleanMemo && cleanMemo.length > 0) {
      return cleanMemo;
    }

    // Usar número do cheque se disponível e não vazio
    if (cleanChecknum && cleanChecknum.length > 0) {
      return `Cheque ${cleanChecknum}`;
    }

    // Mapear tipos OFX para títulos mais legíveis
    const typeMap: { [key: string]: string } = {
      'CREDIT': 'Depósito',
      'DEBIT': 'Saque',
      'INT': 'Juros',
      'DIV': 'Dividendos',
      'FEE': 'Taxa',
      'SRVCHG': 'Taxa de Serviço',
      'DEP': 'Depósito',
      'ATM': 'Saque ATM',
      'POS': 'Compra POS',
      'XFER': 'Transferência',
      'CHECK': 'Cheque',
      'PAYMENT': 'Pagamento',
      'CASH': 'Dinheiro',
      'DIRECTDEP': 'Depósito Direto',
      'DIRECTDEBIT': 'Débito Direto',
      'REPEATPMT': 'Pagamento Recorrente',
      'HOLD': 'Retenção',
      'OTHER': 'Outro',
    };

    // Para transações PIX, usar um título mais específico
    if (cleanMemo && (cleanMemo.includes('PIX') || cleanMemo.includes('pix'))) {
      if (cleanMemo.includes('DEBITO') || cleanMemo.includes('DÉBITO')) {
        return 'Transferência PIX - Débito';
      } else if (cleanMemo.includes('CREDITO') || cleanMemo.includes('CRÉDITO')) {
        return 'Transferência PIX - Crédito';
      } else if (cleanMemo.includes('RECEBIMENTO')) {
        return 'Recebimento PIX';
      }
    }

    return typeMap[cleanTrntype] || `Transação ${cleanTrntype}`;
  }

  async findAll(): Promise<OfxImport[]> {
    return this.prisma.ofxImport.findMany({
      include: {
        bank: true,
        transactions: {
          select: {
            id: true,
            title: true,
            amount: true,
            type: true,
            status: true,
            transactionDate: true,
          },
        },
      },
      orderBy: {
        importDate: 'desc',
      },
    });
  }

  async findOne(id: string): Promise<OfxImport> {
    const importRecord = await this.prisma.ofxImport.findUnique({
      where: { id },
      include: {
        bank: true,
        transactions: {
          select: {
            id: true,
            title: true,
            amount: true,
            type: true,
            status: true,
            transactionDate: true,
            description: true,
          },
        },
        pendingTransactions: {
          include: {
            suggestedCategory: true,
            finalCategory: true,
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

  async remove(id: string): Promise<void> {
    // Verificar se a importação existe
    await this.findOne(id);

    // Excluir a importação (isso também excluirá todas as transações relacionadas devido ao onDelete: Cascade)
    await this.prisma.ofxImport.delete({
      where: { id },
    });
  }

  async getImportStatus(id: string): Promise<{ 
    status: OfxImportStatus; 
    progress: number;
    totalTransactions: number;
    processedTransactions: number;
    errorMessage?: string;
    importDate: Date;
  }> {
    const importRecord = await this.findOne(id);
    
    const progress = importRecord.totalTransactions > 0 
      ? (importRecord.processedTransactions / importRecord.totalTransactions) * 100 
      : 0;

    return {
      status: importRecord.status,
      progress: Math.round(progress),
      totalTransactions: importRecord.totalTransactions || 0,
      processedTransactions: importRecord.processedTransactions || 0,
      errorMessage: importRecord.errorMessage || undefined,
      importDate: importRecord.importDate,
    };
  }
} 