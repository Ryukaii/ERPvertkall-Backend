import { parentPort, workerData } from 'worker_threads';
import { OfxWorkload, OfxWorkerResult } from './ofx-cluster-manager';

// Importar tipos do RegexOptimizationService
interface RegexPattern {
  pattern: RegExp;
  category: string;
  confidence: number;
  reasoning: string;
}

interface ProcessedTransaction {
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
  suggestedCategory?: string;
  categoryConfidence?: number;
  suggestedPaymentMethod?: string;
  paymentMethodConfidence?: number;
}

// Padrões de regex centralizados (sincronizados com RegexOptimizationService)
const CATEGORY_PATTERNS: RegexPattern[] = [
  // ===== FOLHA DE PAGAMENTO (VT/VR) =====
  {
    pattern: /(?:^|[\s\-_\/.,;])(VT|VR)(?=[\s\-_\/.,;]|$)/gi,
    category: 'cmdgg8mbh00020imb47d0hs4r', // ID da categoria "Folha"
    confidence: 100,
    reasoning: 'Identificado como VT/VR (Vale Transporte/Refeição) por regex -> Folha'
  },
  {
    pattern: /(?:VT\s+e\s+VR|VT\s*&\s*VR|VT\s*\/\s*VR)/gi,
    category: 'cmdgg8mbh00020imb47d0hs4r', // ID da categoria "Folha"
    confidence: 100,
    reasoning: 'Identificado como VT e VR (Vale Transporte e Vale Refeição) por regex -> Folha'
  },
  {
    pattern: /(?:^|[\s\-_\/.,;])(FOLHA)(?=[\s\-_\/.,;]|$)/gi,
    category: 'cmdgg8mbh00020imb47d0hs4r', // ID da categoria "Folha"
    confidence: 100,
    reasoning: 'Identificado como Folha de Pagamento por regex -> Folha'
  },
  {
    pattern: /(?:vale[\s\-_]*transporte|vale[\s\-_]*refeicao|vale[\s\-_]*alimentacao)/gi,
    category: 'cmdgg8mbh00020imb47d0hs4r', // ID da categoria "Folha"
    confidence: 95,
    reasoning: 'Identificado como vale (transporte/refeição/alimentação) por regex -> Folha'
  },
  {
    pattern: /(?:beneficio|subsidio|auxilio)/gi,
    category: 'cmdgg8mbh00020imb47d0hs4r', // ID da categoria "Folha"
    confidence: 90,
    reasoning: 'Identificado como benefício/subsídio/auxílio por regex -> Folha'
  },
  {
    pattern: /\b(?:PREMIACAO|premiacao)\b/gi,
    category: 'cmdgg8mbh00020imb47d0hs4r', // ID da categoria "Folha"
    confidence: 100,
    reasoning: 'Identificado como premiação por regex -> Folha'
  },
  {
    pattern: /\b(?:LEADS|leads)\b/gi,
    category: 'cmdgg8mbh00020imb47d0hs4r', // ID da categoria "Folha"
    confidence: 100,
    reasoning: 'Identificado como leads por regex -> Folha'
  }
];

// Padrões de regex para métodos de pagamento (sincronizados com RegexOptimizationService)
const PAYMENT_METHOD_PATTERNS: RegexPattern[] = [
  // ===== PIX =====
  {
    pattern: /\b(?:PIX|PIX\s+RECEBIMENTO|PIX\s+PAGAMENTO|PIX\s+TRANSFERENCIA|PIX\s+ENVIADO|PIX\s+RECEBIDO|PIX\s+IN|PIX\s+OUT)\b/gi,
    category: 'PIX',
    confidence: 100,
    reasoning: 'Identificado como transação PIX por regex'
  },
  
  // ===== BOLETO =====
  {
    pattern: /\b(?:BOLETO|BOLETO\s+BANCARIO|BOLETO\s+PAGO|BOLETO\s+RECEBIDO|BOLETO\s+EMITIDO|BOLETO\s+COMPENSADO|BOLETO\s+LIQUIDADO)\b/gi,
    category: 'Boleto Bancário',
    confidence: 100,
    reasoning: 'Identificado como boleto bancário por regex'
  },
  {
    pattern: /\b(?:BOLETO|BOLETO\s+PAGO|BOLETO\s+RECEBIDO|BOLETO\s+EMITIDO)\b/gi,
    category: 'Boleto',
    confidence: 95,
    reasoning: 'Identificado como boleto por regex'
  },
  
  // ===== CARTÃO DE CRÉDITO =====
  {
    pattern: /\b(?:CARTAO\s+CREDITO|CARTAO\s+DE\s+CREDITO|CREDITO|COMPRA\s+CREDITO|PAGAMENTO\s+CREDITO|CREDITO\s+CARTAO|FATURA\s+CREDITO)\b/gi,
    category: 'Cartão de Crédito',
    confidence: 100,
    reasoning: 'Identificado como cartão de crédito por regex'
  },
  {
    pattern: /\b(?:CREDITO|COMPRA\s+CREDITO|PAGAMENTO\s+CREDITO)\b/gi,
    category: 'Cartão de Crédito',
    confidence: 90,
    reasoning: 'Identificado como crédito (provavelmente cartão) por regex'
  },
  
  // ===== CARTÃO DE DÉBITO =====
  {
    pattern: /\b(?:CARTAO\s+DEBITO|CARTAO\s+DE\s+DEBITO|DEBITO|COMPRA\s+DEBITO|PAGAMENTO\s+DEBITO|DEBITO\s+CARTAO)\b/gi,
    category: 'Cartão de Débito',
    confidence: 100,
    reasoning: 'Identificado como cartão de débito por regex'
  },
  {
    pattern: /\b(?:POS|COMPRA\s+POS|PAGAMENTO\s+POS|TERMINAL\s+POS|POS\s+DEBITO)\b/gi,
    category: 'Cartão de Débito',
    confidence: 85,
    reasoning: 'Identificado como compra POS (provavelmente débito) por regex'
  },
  
  // ===== CHEQUE =====
  {
    pattern: /\b(?:CHEQUE|CHEQUE\s+NUMERO|CHEQUE\s+COMPENSADO|CHEQUE\s+EMITIDO|CHEQUE\s+LIQUIDADO|CHEQUE\s+PROPRIO)\b/gi,
    category: 'Cheque',
    confidence: 100,
    reasoning: 'Identificado como cheque por regex'
  },
  
  // ===== DÉBITO AUTOMÁTICO =====
  {
    pattern: /\b(?:DEBITO\s+AUTOMATICO|DEBITO\s+EM\s+CONTA|DEBITO\s+DIRETO|AUTOMATICO|DEBITO\s+AUT|AUTOMATICO\s+DEBITO)\b/gi,
    category: 'Débito Automático',
    confidence: 100,
    reasoning: 'Identificado como débito automático por regex'
  },
  
  // ===== DINHEIRO =====
  {
    pattern: /\b(?:DINHEIRO|CASH|EFETIVO|ESPECIE|DINHEIRO\s+FISICO)\b/gi,
    category: 'Dinheiro',
    confidence: 100,
    reasoning: 'Identificado como dinheiro por regex'
  },
  {
    pattern: /\b(?:SAQUE|ATM|SAQUE\s+ATM|SAQUE\s+TERMINAL|SAQUE\s+EFETIVO|SAQUE\s+DINHEIRO)\b/gi,
    category: 'Dinheiro',
    confidence: 95,
    reasoning: 'Identificado como saque ATM (dinheiro) por regex'
  },
  
  // ===== TRANSFERÊNCIA BANCÁRIA =====
  {
    pattern: /\b(?:TRANSFERENCIA|TRANSFERENCIA\s+BANCARIA|TRANSFERENCIA\s+ENTRE\s+CONTAS|TED|DOC|TRANSFERENCIA\s+ELETRONICA)\b/gi,
    category: 'Transferência Bancária',
    confidence: 100,
    reasoning: 'Identificado como transferência bancária por regex'
  },
  {
    pattern: /\b(?:DEPOSITO|DEPOSITO\s+BANCARIO|DEPOSITO\s+EM\s+CONTA|DEPOSITO\s+EFETIVO)\b/gi,
    category: 'Transferência Bancária',
    confidence: 90,
    reasoning: 'Identificado como depósito bancário por regex'
  },
  
  // ===== PADRÕES ESPECÍFICOS DE BANCOS =====
  {
    pattern: /\b(?:TED|DOC|TRANSFERENCIA\s+ELETRONICA|TRANSFERENCIA\s+INTERBANCARIA)\b/gi,
    category: 'Transferência Bancária',
    confidence: 100,
    reasoning: 'Identificado como TED/DOC (transferência bancária) por regex'
  },
  
  // ===== PADRÕES DE COMPRAS ONLINE =====
  {
    pattern: /\b(?:COMPRA\s+ONLINE|E-COMMERCE|SHOPPING\s+ONLINE|COMPRA\s+INTERNET)\b/gi,
    category: 'Cartão de Crédito',
    confidence: 80,
    reasoning: 'Identificado como compra online (provavelmente cartão de crédito) por regex'
  },
  
  // ===== PADRÕES DE PAGAMENTOS RECORRENTES =====
  {
    pattern: /\b(?:ASSINATURA|RECORRENTE|MENSALIDADE|PLANO|SUBSCRIPTION)\b/gi,
    category: 'Cartão de Crédito',
    confidence: 85,
    reasoning: 'Identificado como pagamento recorrente (provavelmente cartão de crédito) por regex'
  }
];

// Regex otimizado para correção de encoding (pré-compilado)
const ENCODING_FIXES = [
  [/Ã¡/g, 'á'],
  [/Ã©/g, 'é'],
  [/Ã­/g, 'í'],
  [/Ã³/g, 'ó'],
  [/Ãº/g, 'ú'],
  [/Ã£/g, 'ã'],
  [/Ãµ/g, 'õ'],
  [/Ã§/g, 'ç'],
  [/Ã/g, 'Á'],
  [/Ã‰/g, 'É'],
  [/Ã/g, 'Í'],
  [/Ã"/g, 'Ó'],
  [/Ãš/g, 'Ú'],
  [/Ã‡/g, 'Ç'],
  [/Ã‚/g, 'Â'],
  [/Ãª/g, 'ê'],
  [/Ã´/g, 'ô'],
  [/Ã /g, 'à'],
  [/DÃ‰B/g, 'DÉB'],
  [/CRÃ‰D/g, 'CRÉD'],
  [/TRANSFERÃŠNCIA/g, 'TRANSFERÊNCIA'],
  [/DEPÃ"SITO/g, 'DEPÓSITO'],
  [/SÃƑQUE/g, 'SAQUE']
] as [RegExp, string][];

// Função otimizada para correção de encoding
function fixEncoding(text: string): string {
  if (!text) return text;
  
  let result = text;
  for (const [regex, replacement] of ENCODING_FIXES) {
    result = result.replace(regex, replacement);
  }
  return result;
}

// Função otimizada para categorização (sincronizada com RegexOptimizationService)
function categorizeTransaction(description: string): { category?: string; confidence?: number } {
  const searchText = description.toLowerCase();
  console.log(`🔍 WORKER: Testando categorização para NAME: "${searchText}"`);
  
  for (const pattern of CATEGORY_PATTERNS) {
    // Reset lastIndex para regex global
    pattern.pattern.lastIndex = 0;
    
    if (pattern.pattern.test(searchText)) {
      console.log(`✅ WORKER: Match encontrado no NAME - Padrão: ${pattern.pattern} -> Categoria: ${pattern.category}`);
      return {
        category: pattern.category,
        confidence: pattern.confidence
      };
    }
  }
  
  console.log(`❌ WORKER: Nenhum padrão encontrado no NAME: "${searchText}"`);
  return {};
}

// Função otimizada para detecção de método de pagamento (sincronizada com RegexOptimizationService)
function detectPaymentMethod(description: string): { paymentMethod?: string; confidence?: number } {
  const searchText = description.toLowerCase();
  console.log(`🔍 WORKER: Testando método de pagamento para NAME: "${searchText}"`);
  
  for (const pattern of PAYMENT_METHOD_PATTERNS) {
    // Reset lastIndex para regex global
    pattern.pattern.lastIndex = 0;
    
    if (pattern.pattern.test(searchText)) {
      console.log(`✅ WORKER: Match encontrado no NAME - Padrão: ${pattern.pattern} -> Método: ${pattern.category}`);
      return {
        paymentMethod: pattern.category,
        confidence: pattern.confidence
      };
    }
  }
  
  console.log(`❌ WORKER: Nenhum padrão de método de pagamento encontrado no NAME: "${searchText}"`);
  return {};
}

// Função para processar data OFX otimizada
function parseOfxDate(dateString: string): Date {
  if (!dateString || dateString.length < 8) {
    throw new Error(`Formato de data OFX inválido: ${dateString}`);
  }

  const year = parseInt(dateString.substring(0, 4));
  const month = parseInt(dateString.substring(4, 6)) - 1;
  const day = parseInt(dateString.substring(6, 8));
  
  // Validação rápida
  if (year < 1900 || year > 2100 || month < 0 || month > 11 || day < 1 || day > 31) {
    throw new Error(`Data inválida: ${dateString}`);
  }

  return new Date(year, month, day);
}

// Função para gerar título otimizada
function generateTransactionTitle(trntype: string, memo: string, checknum: string): string {
  const cleanMemo = memo?.trim() || '';
  const cleanChecknum = checknum?.trim() || '';
  
  if (cleanMemo) return cleanMemo;
  if (cleanChecknum) return `Cheque ${cleanChecknum}`;
  
  // Mapeamento rápido
  const typeMap: Record<string, string> = {
    'CREDIT': 'Depósito',
    'DEBIT': 'Saque',
    'INT': 'Juros',
    'FEE': 'Taxa',
    'ATM': 'Saque ATM',
    'POS': 'Compra POS',
    'PIX': 'PIX'
  };
  
  return typeMap[trntype] || `Transação ${trntype}`;
}

// Função principal do worker
function processTransactionChunk(transactions: any[]): ProcessedTransaction[] {
  const results: ProcessedTransaction[] = [];
  
  for (const ofxTransaction of transactions) {
    try {
      const {
        TRNTYPE = 'OTHER',
        DTPOSTED,
        TRNAMT = '0',
        FITID = null,
        MEMO = '',
        NAME = '',
        CHECKNUM = null,
      } = ofxTransaction;

      // Validações rápidas
      if (!DTPOSTED || !TRNAMT || TRNAMT === '0') continue;

      const amount = parseFloat(TRNAMT);
      if (isNaN(amount)) continue;

      const amountInCents = Math.round(Math.abs(amount) * 100);
      
      // Determinar tipo
      const creditTypes = ['CREDIT', 'DEP', 'DIRECTDEP', 'INT', 'DIV'];
      const debitTypes = ['DEBIT', 'ATM', 'POS', 'FEE', 'SRVCHG', 'CHECK', 'PAYMENT'];
      
      const isCredit = creditTypes.includes(TRNTYPE);
      const isDebit = debitTypes.includes(TRNTYPE);
      
      const transactionType = isCredit ? 'CREDIT' : isDebit ? 'DEBIT' : 'OTHER';
      
      // Processar data
      const transactionDate = parseOfxDate(DTPOSTED);
      
      // Corrigir encoding
      const cleanMemo = fixEncoding(MEMO);
      const cleanName = fixEncoding(NAME);
      
      // Gerar título
      const title = generateTransactionTitle(TRNTYPE, cleanMemo, CHECKNUM);
      
      // Log para debug - mostrar campos MEMO vs NAME
      console.log(`🔍 WORKER: MEMO: "${cleanMemo}" | NAME: "${cleanName}"`);
      
      // Categorização automática (usando apenas NAME/description)
      const categoryResult = categorizeTransaction(cleanName);
      
      if (categoryResult.category) {
        console.log(`🎯 WORKER: Categoria encontrada no NAME: "${cleanName}" -> ${categoryResult.category} (${categoryResult.confidence}%)`);
      }
      
      // Detecção de método de pagamento (usando apenas NAME/description)
      const paymentMethodResult = detectPaymentMethod(cleanName);
      
      if (paymentMethodResult.paymentMethod) {
        console.log(`💳 WORKER: Método de pagamento encontrado no NAME: "${cleanName}" -> ${paymentMethodResult.paymentMethod} (${paymentMethodResult.confidence}%)`);
      }
      
      const processedTransaction: ProcessedTransaction = {
        title,
        description: cleanName,
        amount: amountInCents,
        type: transactionType,
        transactionDate,
        fitid: FITID,
        trntype: TRNTYPE,
        checknum: CHECKNUM,
        memo: cleanMemo,
        name: cleanName,
        suggestedCategory: categoryResult.category,
        categoryConfidence: categoryResult.confidence,
        suggestedPaymentMethod: paymentMethodResult.paymentMethod,
        paymentMethodConfidence: paymentMethodResult.confidence
      };
      
      results.push(processedTransaction);
      
    } catch (error) {
      console.error(`❌ Erro processando transação:`, error);
    }
  }
  
  return results;
}

// Listener para mensagens do thread principal
if (parentPort) {
  parentPort.on('message', async (workload: OfxWorkload) => {
    try {
      console.log(`🔄 Worker ${workerData.workerId} processando chunk ${workload.chunkIndex}/${workload.totalChunks}`);
      
      const processedTransactions = processTransactionChunk(workload.transactions);
      
      const result: OfxWorkerResult = {
        id: workload.id,
        success: true,
        processedCount: processedTransactions.length,
        errors: [],
        chunkIndex: workload.chunkIndex,
        categorizedTransactions: processedTransactions
      };
      
      parentPort!.postMessage(result);
      
    } catch (error) {
      console.error(`❌ Worker ${workerData.workerId} erro:`, error);
      
      const errorResult: OfxWorkerResult = {
        id: workload.id,
        success: false,
        processedCount: 0,
        errors: [error.message],
        chunkIndex: workload.chunkIndex,
        categorizedTransactions: []
      };
      
      parentPort!.postMessage(errorResult);
    }
  });
}