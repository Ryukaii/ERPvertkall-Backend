const { parentPort, workerData } = require("worker_threads");
const { OfxWorkload, OfxWorkerResult } = require("./ofx-cluster-manager");

// Padrões de regex centralizados (sincronizados com RegexOptimizationService)
const CATEGORY_PATTERNS = [
  // Padrões para Folha de Pagamento (robustos e consistentes)
  {
    pattern: /(?:^|[\s\-_\/.,;])(VT|VR)(?=[\s\-_\/.,;]|$)/gi,
    category: 'cmdgg8mbh00020imb47d0hs4r',
    confidence: 100
  },
  {
    pattern: /(?:VT\s+e\s+VR|VT\s*&\s*VR|VT\s*\/\s*VR)/gi,
    category: 'cmdgg8mbh00020imb47d0hs4r',
    confidence: 100
  },
  {
    pattern: /(?:^|[\s\-_\/.,;])(FOLHA)(?=[\s\-_\/.,;]|$)/gi,
    category: 'cmdgg8mbh00020imb47d0hs4r',
    confidence: 100
  },
  {
    pattern: /(?:vale[\s\-_]*transporte|vale[\s\-_]*refeicao|vale[\s\-_]*alimentacao)/gi,
    category: 'cmdgg8mbh00020imb47d0hs4r',
    confidence: 95
  },
  {
    pattern: /(?:beneficio|subsidio|auxilio)/gi,
    category: 'cmdgg8mbh00020imb47d0hs4r',
    confidence: 90
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
];

// Função otimizada para correção de encoding
function fixEncoding(text) {
  if (!text) return text;
  
  let result = text;
  for (const [regex, replacement] of ENCODING_FIXES) {
    result = result.replace(regex, replacement);
  }
  return result;
}

// Função otimizada para categorização (sincronizada com RegexOptimizationService)
function categorizeTransaction(description) {
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

// Função para processar data OFX otimizada
function parseOfxDate(dateString) {
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
function generateTransactionTitle(trntype, memo, checknum) {
  const cleanMemo = memo?.trim() || '';
  const cleanChecknum = checknum?.trim() || '';
  
  if (cleanMemo) return cleanMemo;
  if (cleanChecknum) return `Cheque ${cleanChecknum}`;
  
  // Mapeamento rápido
  const typeMap = {
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
function processTransactionChunk(transactions) {
  const results = [];
  
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
      
      const processedTransaction = {
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
        categoryConfidence: categoryResult.confidence
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
  parentPort.on('message', async (workload) => {
    try {
      console.log(`🔄 Worker ${workerData.workerId} processando chunk ${workload.chunkIndex}/${workload.totalChunks}`);
      
      const processedTransactions = processTransactionChunk(workload.transactions);
      
      const result = {
        id: workload.id,
        success: true,
        processedCount: processedTransactions.length,
        errors: [],
        chunkIndex: workload.chunkIndex,
        categorizedTransactions: processedTransactions
      };
      
      parentPort.postMessage(result);
      
    } catch (error) {
      console.error(`❌ Worker ${workerData.workerId} erro:`, error);
      
      const errorResult = {
        id: workload.id,
        success: false,
        processedCount: 0,
        errors: [error.message],
        chunkIndex: workload.chunkIndex,
        categorizedTransactions: []
      };
      
      parentPort.postMessage(errorResult);
    }
  });
}