import { Injectable, Logger } from '@nestjs/common';

export interface CategoryMatch {
  categoryName: string;
  confidence: number;
  reasoning: string;
}

export interface PaymentMethodMatch {
  paymentMethodName: string;
  confidence: number;
  reasoning: string;
}

export interface EncodingFix {
  pattern: RegExp;
  replacement: string;
}

export interface RegexPattern {
  pattern: RegExp;
  category: string;
  confidence: number;
  reasoning: string;
}

export interface PaymentMethodPattern {
  pattern: RegExp;
  paymentMethodName: string;
  confidence: number;
  reasoning: string;
}

@Injectable()
export class RegexOptimizationService {
  private readonly logger = new Logger(RegexOptimizationService.name);
  
  // Cache de regex pré-compilados para categorização
  private readonly categoryPatterns: RegexPattern[] = [];

  // Cache de regex pré-compilados para métodos de pagamento
  private readonly paymentMethodPatterns: PaymentMethodPattern[] = [];

  // Regex pré-compilados para correção de encoding
  private readonly encodingFixes: EncodingFix[] = [];

  constructor() {
    this.initializeCategoryPatterns();
    this.initializePaymentMethodPatterns();
    this.initializeEncodingFixes();
    this.logger.log('✅ Regex patterns pré-compilados inicializados');
  }

  /**
   * Inicializar padrões de regex para categorização (pré-compilados)
   */
  private initializeCategoryPatterns(): void {
    const patterns: RegexPattern[] = [
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

    this.categoryPatterns.push(...patterns);
  }

  /**
   * Inicializar padrões de regex para métodos de pagamento (pré-compilados)
   */
  private initializePaymentMethodPatterns(): void {
    const patterns: PaymentMethodPattern[] = [
      // ===== PIX =====
      {
        pattern: /\b(?:PIX|PIX\s+RECEBIMENTO|PIX\s+PAGAMENTO|PIX\s+TRANSFERENCIA|PIX\s+ENVIADO|PIX\s+RECEBIDO|PIX\s+IN|PIX\s+OUT)\b/gi,
        paymentMethodName: 'PIX',
        confidence: 100,
        reasoning: 'Identificado como transação PIX por regex'
      },
      
      // ===== BOLETO =====
      {
        pattern: /\b(?:BOLETO|BOLETO\s+BANCARIO|BOLETO\s+PAGO|BOLETO\s+RECEBIDO|BOLETO\s+EMITIDO|BOLETO\s+COMPENSADO|BOLETO\s+LIQUIDADO)\b/gi,
        paymentMethodName: 'Boleto Bancário',
        confidence: 100,
        reasoning: 'Identificado como boleto bancário por regex'
      },
      {
        pattern: /\b(?:BOLETO|BOLETO\s+PAGO|BOLETO\s+RECEBIDO|BOLETO\s+EMITIDO)\b/gi,
        paymentMethodName: 'Boleto',
        confidence: 95,
        reasoning: 'Identificado como boleto por regex'
      },
      
      // ===== CARTÃO DE CRÉDITO =====
      {
        pattern: /\b(?:CARTAO\s+CREDITO|CARTAO\s+DE\s+CREDITO|CREDITO|COMPRA\s+CREDITO|PAGAMENTO\s+CREDITO|CREDITO\s+CARTAO|FATURA\s+CREDITO)\b/gi,
        paymentMethodName: 'Cartão de Crédito',
        confidence: 100,
        reasoning: 'Identificado como cartão de crédito por regex'
      },
      {
        pattern: /\b(?:CREDITO|COMPRA\s+CREDITO|PAGAMENTO\s+CREDITO)\b/gi,
        paymentMethodName: 'Cartão de Crédito',
        confidence: 90,
        reasoning: 'Identificado como crédito (provavelmente cartão) por regex'
      },
      
      // ===== CARTÃO DE DÉBITO =====
      {
        pattern: /\b(?:CARTAO\s+DEBITO|CARTAO\s+DE\s+DEBITO|DEBITO|COMPRA\s+DEBITO|PAGAMENTO\s+DEBITO|DEBITO\s+CARTAO)\b/gi,
        paymentMethodName: 'Cartão de Débito',
        confidence: 100,
        reasoning: 'Identificado como cartão de débito por regex'
      },
      {
        pattern: /\b(?:POS|COMPRA\s+POS|PAGAMENTO\s+POS|TERMINAL\s+POS|POS\s+DEBITO)\b/gi,
        paymentMethodName: 'Cartão de Débito',
        confidence: 85,
        reasoning: 'Identificado como compra POS (provavelmente débito) por regex'
      },
      
      // ===== CHEQUE =====
      {
        pattern: /\b(?:CHEQUE|CHEQUE\s+NUMERO|CHEQUE\s+COMPENSADO|CHEQUE\s+EMITIDO|CHEQUE\s+LIQUIDADO|CHEQUE\s+PROPRIO)\b/gi,
        paymentMethodName: 'Cheque',
        confidence: 100,
        reasoning: 'Identificado como cheque por regex'
      },
      
      // ===== DÉBITO AUTOMÁTICO =====
      {
        pattern: /\b(?:DEBITO\s+AUTOMATICO|DEBITO\s+EM\s+CONTA|DEBITO\s+DIRETO|AUTOMATICO|DEBITO\s+AUT|AUTOMATICO\s+DEBITO)\b/gi,
        paymentMethodName: 'Débito Automático',
        confidence: 100,
        reasoning: 'Identificado como débito automático por regex'
      },
      
      // ===== DINHEIRO =====
      {
        pattern: /\b(?:DINHEIRO|CASH|EFETIVO|ESPECIE|DINHEIRO\s+FISICO)\b/gi,
        paymentMethodName: 'Dinheiro',
        confidence: 100,
        reasoning: 'Identificado como dinheiro por regex'
      },
      {
        pattern: /\b(?:SAQUE|ATM|SAQUE\s+ATM|SAQUE\s+TERMINAL|SAQUE\s+EFETIVO|SAQUE\s+DINHEIRO)\b/gi,
        paymentMethodName: 'Dinheiro',
        confidence: 95,
        reasoning: 'Identificado como saque ATM (dinheiro) por regex'
      },
      
      // ===== TRANSFERÊNCIA BANCÁRIA =====
      {
        pattern: /\b(?:TRANSFERENCIA|TRANSFERENCIA\s+BANCARIA|TRANSFERENCIA\s+ENTRE\s+CONTAS|TED|DOC|TRANSFERENCIA\s+ELETRONICA)\b/gi,
        paymentMethodName: 'Transferência Bancária',
        confidence: 100,
        reasoning: 'Identificado como transferência bancária por regex'
      },
      {
        pattern: /\b(?:DEPOSITO|DEPOSITO\s+BANCARIO|DEPOSITO\s+EM\s+CONTA|DEPOSITO\s+EFETIVO)\b/gi,
        paymentMethodName: 'Transferência Bancária',
        confidence: 90,
        reasoning: 'Identificado como depósito bancário por regex'
      },
      
      // ===== PADRÕES ESPECÍFICOS DE BANCOS =====
      {
        pattern: /\b(?:TED|DOC|TRANSFERENCIA\s+ELETRONICA|TRANSFERENCIA\s+INTERBANCARIA)\b/gi,
        paymentMethodName: 'Transferência Bancária',
        confidence: 100,
        reasoning: 'Identificado como TED/DOC (transferência bancária) por regex'
      },
      
      // ===== PADRÕES DE COMPRAS ONLINE =====
      {
        pattern: /\b(?:COMPRA\s+ONLINE|E-COMMERCE|SHOPPING\s+ONLINE|COMPRA\s+INTERNET)\b/gi,
        paymentMethodName: 'Cartão de Crédito',
        confidence: 80,
        reasoning: 'Identificado como compra online (provavelmente cartão de crédito) por regex'
      },
      
      // ===== PADRÕES DE PAGAMENTOS RECORRENTES =====
      {
        pattern: /\b(?:ASSINATURA|RECORRENTE|MENSALIDADE|PLANO|SUBSCRIPTION)\b/gi,
        paymentMethodName: 'Cartão de Crédito',
        confidence: 85,
        reasoning: 'Identificado como pagamento recorrente (provavelmente cartão de crédito) por regex'
      }
    ];

    this.paymentMethodPatterns.push(...patterns);
  }

  /**
   * Inicializar padrões de correção de encoding (pré-compilados)
   */
  private initializeEncodingFixes(): void {
    const fixes: EncodingFix[] = [
      { pattern: /Ã¡/g, replacement: 'á' },
      { pattern: /Ã©/g, replacement: 'é' },
      { pattern: /Ã­/g, replacement: 'í' },
      { pattern: /Ã³/g, replacement: 'ó' },
      { pattern: /Ãº/g, replacement: 'ú' },
      { pattern: /Ã£/g, replacement: 'ã' },
      { pattern: /Ãµ/g, replacement: 'õ' },
      { pattern: /Ã§/g, replacement: 'ç' },
      { pattern: /Ã/g, replacement: 'Á' },
      { pattern: /Ã‰/g, replacement: 'É' },
      { pattern: /Ã/g, replacement: 'Í' },
      { pattern: /Ã"/g, replacement: 'Ó' },
      { pattern: /Ãš/g, replacement: 'Ú' },
      { pattern: /Ã‡/g, replacement: 'Ç' },
      { pattern: /Ã‚/g, replacement: 'Â' },
      { pattern: /Ãª/g, replacement: 'ê' },
      { pattern: /Ã´/g, replacement: 'ô' },
      { pattern: /Ã /g, replacement: 'à' },
      // Correções específicas para termos bancários
      { pattern: /DÃ‰B/g, replacement: 'DÉB' },
      { pattern: /CRÃ‰D/g, replacement: 'CRÉD' },
      { pattern: /TRANSFERÃŠNCIA/g, replacement: 'TRANSFERÊNCIA' },
      { pattern: /DEPÃ"SITO/g, replacement: 'DEPÓSITO' },
      { pattern: /SÃƒQUE/g, replacement: 'SAQUE' }
    ];

    this.encodingFixes.push(...fixes);
  }

  /**
   * Corrigir encoding de texto usando regex pré-compilados
   */
  fixEncoding(text: string): string {
    if (!text) return text;
    
    let result = text;
    
    // Aplicar todas as correções de encoding de forma otimizada
    for (const fix of this.encodingFixes) {
      result = result.replace(fix.pattern, fix.replacement);
    }
    
    return result;
  }

  /**
   * Buscar categoria usando regex otimizado
   */
  findCategoryMatch(title: string, description: string): CategoryMatch | null {
    const searchText = description.toLowerCase();
    
    // Iterar pelos padrões pré-compilados
    for (const pattern of this.categoryPatterns) {
      // Reset lastIndex para regex global
      pattern.pattern.lastIndex = 0;
      
      if (pattern.pattern.test(searchText)) {
        return {
          categoryName: pattern.category,
          confidence: pattern.confidence,
          reasoning: pattern.reasoning
        };
      }
    }
    
    return null;
  }

  /**
   * Buscar método de pagamento usando regex otimizado
   */
  findPaymentMethodMatch(title: string, description: string): PaymentMethodMatch | null {
    const searchText = description.toLowerCase();
    
    // Iterar pelos padrões pré-compilados
    for (const pattern of this.paymentMethodPatterns) {
      // Reset lastIndex para regex global
      pattern.pattern.lastIndex = 0;
      
      if (pattern.pattern.test(searchText)) {
        return {
          paymentMethodName: pattern.paymentMethodName,
          confidence: pattern.confidence,
          reasoning: pattern.reasoning
        };
      }
    }
    
    return null;
  }

  /**
   * Método para workers - retorna dados em formato compatível
   */
  categorizeTransaction(title: string, description: string): { category?: string; confidence?: number } {
    const match = this.findCategoryMatch(title, description);
    return {
      category: match?.categoryName,
      confidence: match?.confidence
    };
  }

  /**
   * Método para workers - retorna padrões em formato compatível
   */
  getCategoryPatterns(): RegexPattern[] {
    return this.categoryPatterns;
  }

  /**
   * Método para workers - retorna correções de encoding em formato compatível
   */
  getEncodingFixes(): [RegExp, string][] {
    return this.encodingFixes.map(fix => [fix.pattern, fix.replacement]);
  }

  /**
   * Estatísticas dos padrões carregados
   */
  getStats() {
    return {
      categoryPatterns: this.categoryPatterns.length,
      paymentMethodPatterns: this.paymentMethodPatterns.length,
      encodingFixes: this.encodingFixes.length,
      totalPatterns: this.categoryPatterns.length + this.paymentMethodPatterns.length + this.encodingFixes.length
    };
  }
}