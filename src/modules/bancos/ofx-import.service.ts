import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service';
import { ImportOfxDto } from './dto/import-ofx.dto';
import { OfxImport, OfxImportStatus, FinancialTransactionType, FinancialTransactionStatus } from '@prisma/client';
import * as ofx from 'ofx';
import { AiCategorizationService } from './ai-categorization.service';

@Injectable()
export class OfxImportService {
  constructor(
    private prisma: PrismaService,
    private aiCategorizationService: AiCategorizationService,
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
    // Executar processamento em background
    setImmediate(async () => {
      try {
        console.log(`🚀 === INICIANDO WORKER PARA IMPORT ${importId} ===`);
        
        // Atualizar status para PROCESSING
        await this.prisma.ofxImport.update({
          where: { id: importId },
          data: { status: 'PROCESSING' },
        });

        // Detectar encoding e processar o arquivo OFX
        const ofxContent = this.detectAndDecodeFile(fileBuffer);
        const result = await this.processOfxFile(ofxContent, importId, userId);

        console.log(`✅ === WORKER FINALIZADO PARA IMPORT ${importId} ===`);
        console.log(`📊 Status final: ${result.status}`);
        console.log(`📊 Total de transações: ${result.totalTransactions}`);
        console.log(`📊 Processadas: ${result.processedTransactions}`);

      } catch (error) {
        console.error(`❌ === ERRO NO WORKER PARA IMPORT ${importId} ===`);
        console.error(error);
        
        // Atualizar status para FAILED
        await this.prisma.ofxImport.update({
          where: { id: importId },
          data: {
            status: 'FAILED',
            errorMessage: error.message,
          },
        });
      }
    });
  }

  private detectAndDecodeFile(buffer: Buffer): string {
    // Tentar diferentes encodings comuns para arquivos OFX
    const encodings: BufferEncoding[] = ['utf-8', 'latin1', 'ascii'];
    
    for (const encoding of encodings) {
      try {
        const content = buffer.toString(encoding);
        
        // Verificar se o conteúdo parece válido (não tem caracteres de substituição)
        if (!content.includes('\uFFFD') && content.includes('<OFX>')) {
          console.log(`Arquivo decodificado com sucesso usando encoding: ${encoding}`);
          return content;
        }
      } catch (error) {
        // Continuar para próximo encoding
        continue;
      }
    }
    
    // Se nenhum encoding funcionou perfeitamente, usar latin1 como fallback
    // pois é o mais comum para arquivos bancários brasileiros
    console.log('Usando latin1 como fallback para decodificação');
    return buffer.toString('latin1');
  }

  async processOfxFile(ofxContent: string, importId: string, userId: string): Promise<OfxImport> {
    try {
      console.log(`📊 === INICIANDO PROCESSAMENTO OFX ${importId} ===`);

      // Parse do arquivo OFX
      const ofxData = ofx.parse(ofxContent);
      
      if (!ofxData.OFX || !ofxData.OFX.BANKMSGSRSV1 || !ofxData.OFX.BANKMSGSRSV1.STMTTRNRS) {
        throw new BadRequestException('Formato OFX inválido');
      }

      const stmttrnrs = ofxData.OFX.BANKMSGSRSV1.STMTTRNRS;
      const banktranlist = stmttrnrs.STMTRS.BANKTRANLIST;
      
      if (!banktranlist || !banktranlist.STMTTRN) {
        throw new BadRequestException('Nenhuma transação encontrada no arquivo OFX');
      }

      const transactions = Array.isArray(banktranlist.STMTTRN) 
        ? banktranlist.STMTTRN 
        : [banktranlist.STMTTRN];

      console.log(`📊 Total de transações encontradas: ${transactions.length}`);

      let processedCount = 0;
      const errors: string[] = [];

      // Atualizar total de transações
      await this.prisma.ofxImport.update({
        where: { id: importId },
        data: { totalTransactions: transactions.length },
      });

      // Processar cada transação
      for (let i = 0; i < transactions.length; i++) {
        const ofxTransaction = transactions[i];
        
        try {
          console.log(`🔄 Processando transação ${i + 1}/${transactions.length}`);
          await this.processTransaction(ofxTransaction, importId, userId);
          processedCount++;
          
          // Atualizar progresso a cada 10 transações
          if (processedCount % 10 === 0 || processedCount === transactions.length) {
            await this.prisma.ofxImport.update({
              where: { id: importId },
              data: { processedTransactions: processedCount },
            });
            console.log(`📈 Progresso: ${processedCount}/${transactions.length} (${Math.round((processedCount/transactions.length)*100)}%)`);
          }
        } catch (error) {
          console.error(`❌ Erro ao processar transação ${i + 1}:`, error.message);
          errors.push(`Erro ao processar transação ${i + 1}: ${error.message}`);
        }
      }

      // Atualizar importação com resultado final
      // Agora sempre fica PENDING_REVIEW para análise das categorizações
      const status = errors.length === 0 ? 'PENDING_REVIEW' : 'FAILED';
      const errorMessage = errors.length > 0 ? errors.join('; ') : null;

      console.log(`✅ === FINALIZANDO PROCESSAMENTO OFX ${importId} ===`);
      console.log(`📊 Status: ${status}`);
      console.log(`📊 Processadas: ${processedCount}/${transactions.length}`);
      console.log(`📊 Erros: ${errors.length}`);

      return this.prisma.ofxImport.update({
        where: { id: importId },
        data: {
          status,
          totalTransactions: transactions.length,
          processedTransactions: processedCount,
          errorMessage,
        },
      });

    } catch (error) {
      console.error(`❌ === ERRO NO PROCESSAMENTO OFX ${importId} ===`);
      console.error(error);
      
      // Atualizar status para FAILED em caso de erro
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
    const {
      TRNTYPE,
      DTPOSTED,
      TRNAMT,
      FITID,
      MEMO,
      NAME,
      CHECKNUM,
    } = ofxTransaction;

    // Log para debug - mostrar dados originais recebidos
    console.log('Processando transação OFX:', {
      TRNTYPE,
      MEMO: MEMO ? `"${MEMO}"` : 'undefined',
      NAME: NAME ? `"${NAME}"` : 'undefined',
      TRNAMT,
    });

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
        .replace(/RESGATEAPLICAÃ‡ÃƒO/g, 'RESGATE APLICAÇÃO');

      // Log para debug quando houver correções
      if (fixedText !== text) {
        console.log(`Encoding corrigido: "${text}" -> "${fixedText}"`);
      }
      
      return fixedText;
    };

    // Determinar tipo da transação baseado no TRNTYPE e valor
    const amount = parseFloat(TRNAMT);
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

    // Converter data do OFX
    const transactionDate = this.parseOfxDate(DTPOSTED);

    // Corrigir encoding dos campos de texto
    const fixedMemo = fixEncoding(MEMO || '');
    const fixedName = fixEncoding(NAME || '');
    
    // Criar título baseado no tipo de transação
    const title = this.generateTransactionTitle(TRNTYPE, fixedMemo, CHECKNUM);

    // Verificar se a transação já existe (evitar duplicatas)
    const existingTransaction = await this.prisma.ofxPendingTransaction.findFirst({
      where: {
        ofxImportId: importId,
        title,
        amount: amountInCents,
        transactionDate,
      },
    });

    if (existingTransaction) {
      return; // Transação já existe, pular
    }

    // Criar nova transação pendente
    const pendingTransaction = await this.prisma.ofxPendingTransaction.create({
      data: {
        ofxImportId: importId,
        title,
        description: fixedName || fixedMemo || `Transação OFX - ${TRNTYPE}`,
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

    // Tentar categorização automática com ChatGPT
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
    }
    
    console.log('🤖 === FIM DEBUG OFX CATEGORIZAÇÃO ===\n');
  }

  private parseOfxDate(dateString: string): Date {
    // Formato OFX: YYYYMMDDHHMMSS
    const year = parseInt(dateString.substring(0, 4));
    const month = parseInt(dateString.substring(4, 6)) - 1; // Mês é 0-indexed
    const day = parseInt(dateString.substring(6, 8));
    const hour = parseInt(dateString.substring(8, 10));
    const minute = parseInt(dateString.substring(10, 12));
    const second = parseInt(dateString.substring(12, 14));

    return new Date(year, month, day, hour, minute, second);
  }

  private generateTransactionTitle(trntype: string, memo: string, checknum: string): string {
    // Usar memo corrigido se disponível
    if (memo && memo.trim().length > 0) {
      return memo.trim();
    }

    // Usar número do cheque se disponível
    if (checknum) {
      return `Cheque ${checknum}`;
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

    return typeMap[trntype] || `Transação ${trntype}`;
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