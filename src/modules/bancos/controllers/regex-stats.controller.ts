import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { ModuleAccessGuard } from '../../../common/guards/module-access.guard';
import { PermissionGuard } from '../../../common/guards/permission.guard';
import { RequireModule } from '../../../common/decorators/module.decorator';
import { Permission } from '../../../common/decorators/permission.decorator';
import { RegexOptimizationService } from '../services/regex-optimization.service';
import { OfxClusterManager } from '../workers/ofx-cluster-manager';
import { OfxBulkProcessorService } from '../services/ofx-bulk-processor.service';

@Controller('regex-stats')
@UseGuards(JwtAuthGuard, ModuleAccessGuard, PermissionGuard)
@RequireModule('bancos')
export class RegexStatsController {
  constructor(
    private readonly regexOptimization: RegexOptimizationService,
    private readonly clusterManager: OfxClusterManager,
    private readonly bulkProcessor: OfxBulkProcessorService,
  ) {}

  @Get()
  @Permission('bancos', 'ofx_imports', 'read')
  async getRegexStats() {
    const stats = this.regexOptimization.getStats();
    
    return {
      message: 'Estatísticas do sistema de regex otimizado',
      stats,
      description: {
        categoryPatterns: 'Padrões de regex para categorização automática',
        paymentMethodPatterns: 'Padrões de regex para métodos de pagamento',
        encodingFixes: 'Correções de encoding para caracteres brasileiros',
        totalPatterns: 'Total de padrões pré-compilados'
      },
      performance: {
        advantage: 'Regex pré-compilados oferecem 3-5x melhor performance',
        memory: 'Cache em memória evita recompilação desnecessária',
        threading: 'Thread-safe para uso em workers paralelos'
      }
    };
  }

  @Get('test')
  @Permission('bancos', 'ofx_imports', 'read')
  async testRegexPatterns() {
    const testCases = [
      {
        title: 'PIX TRANSFERENCIA',
        description: 'Pagamento via PIX',
        expectedCategory: 'Aporte Financeiro',
        expectedPaymentMethod: 'PIX'
      },
      {
        title: 'COMPRA UBER',
        description: 'Viagem de uber',
        expectedCategory: 'COMPRAS',
        expectedPaymentMethod: null
      },
      {
        title: 'NETFLIX ASSINATURA',
        description: 'Mensalidade Netflix',
        expectedCategory: 'COMPRAS',
        expectedPaymentMethod: null
      },
      {
        title: 'SAQUE ATM',
        description: 'Saque no terminal',
        expectedCategory: null,
        expectedPaymentMethod: 'Dinheiro'
      },
      {
        title: 'IOF COBRANCA',
        description: 'Taxa IOF',
        expectedCategory: 'Impostos',
        expectedPaymentMethod: null
      }
    ];

    const results = testCases.map(testCase => {
      const categoryMatch = this.regexOptimization.findCategoryMatch(
        '', 
        testCase.description
      );
      
      const paymentMethodMatch = this.regexOptimization.findPaymentMethodMatch(
        '', 
        testCase.description
      );

      return {
        input: testCase,
        results: {
          category: categoryMatch,
          paymentMethod: paymentMethodMatch
        },
        success: {
          category: categoryMatch?.categoryName === testCase.expectedCategory,
          paymentMethod: paymentMethodMatch?.paymentMethodName === testCase.expectedPaymentMethod
        }
      };
    });

    return {
      message: 'Teste dos padrões de regex otimizado',
      totalTests: testCases.length,
      results,
      summary: {
        categoryMatches: results.filter(r => r.results.category).length,
        paymentMethodMatches: results.filter(r => r.results.paymentMethod).length,
        categorySuccessRate: results.filter(r => r.success.category).length / testCases.length * 100,
        paymentMethodSuccessRate: results.filter(r => r.success.paymentMethod).length / testCases.length * 100
      }
    };
  }

  @Post('test-regex')
  @Permission('bancos', 'ofx_imports', 'read')
  async testRegex(@Body() body: { title: string; description: string }) {
    const { title, description } = body;
    
    console.log(`🧪 === TESTE MANUAL DE REGEX ===`);
    console.log(`📝 Input: "${title}" | "${description}"`);
    
    // Testar via RegexOptimizationService
    const categoryMatch = this.regexOptimization.findCategoryMatch('', description);
    const paymentMethodMatch = this.regexOptimization.findPaymentMethodMatch('', description);
    
    console.log(`🎯 Categoria encontrada:`, categoryMatch);
    console.log(`💳 Método de pagamento encontrado:`, paymentMethodMatch);
    
    return {
      input: { title, description },
      results: {
        category: categoryMatch,
        paymentMethod: paymentMethodMatch
      },
      message: 'Teste de regex executado com sucesso'
    };
  }

  @Post('test-worker')
  @Permission('bancos', 'ofx_imports', 'read')
  async testWorker(@Body() body: { transactions: any[] }) {
    const { transactions } = body;
    
    console.log(`🧪 === TESTE MANUAL DE WORKER ===`);
    console.log(`📝 Testando ${transactions.length} transações`);
    
    // Simular transações OFX
    const mockTransactions = transactions.map((tx, index) => ({
      TRNTYPE: tx.type || 'OTHER',
      DTPOSTED: tx.date || '20240101',
      TRNAMT: tx.amount || '100.00',
      MEMO: tx.title || `Teste ${index + 1}`,
      NAME: tx.description || '',
      FITID: `TEST${index + 1}`,
      CHECKNUM: null
    }));
    
    try {
      // Testar via cluster manager
      const results = await this.clusterManager.processTransactionsInParallel(
        mockTransactions,
        'test-import-id',
        'test-user-id'
      );
      
      console.log(`✅ Worker processamento completo:`, results);
      
      return {
        input: { transactionCount: transactions.length },
        results: results,
        message: 'Teste de worker executado com sucesso'
      };
      
    } catch (error) {
      console.error(`❌ Erro no teste de worker:`, error);
      return {
        input: { transactionCount: transactions.length },
        error: error.message,
        message: 'Erro no teste de worker'
      };
    }
  }

  @Post('test-folha')
  @Permission('bancos', 'ofx_imports', 'read')
  async testFolhaRegex() {
    const testCases = [
      { title: 'VT ALIMENTACAO', description: 'Vale transporte' },
      { title: 'VR BENEFICIO', description: 'Vale refeição' },
      { title: 'FOLHA PAGAMENTO', description: 'Folha de pagamento mensal' },
      { title: 'PREMIACAO VENDAS', description: 'Premiação por vendas' },
      { title: 'LEADS COMISSAO', description: 'Comissão por leads' },
      { title: 'BENEFICIO FUNCIONARIO', description: 'Benefício para funcionário' },
      { title: 'VALE TRANSPORTE MENSAL', description: 'Vale transporte do mês' },
      { title: 'AUXILIO ALIMENTACAO', description: 'Auxílio alimentação' },
      { title: 'SUBSIDIO TRANSPORTE', description: 'Subsídio de transporte' }
    ];

    console.log('🧪 === TESTE ESPECÍFICO PARA FOLHA ===');

    const results = testCases.map(testCase => {
      const categoryMatch = this.regexOptimization.findCategoryMatch(
        '', 
        testCase.description
      );

      const shouldBeFolha = categoryMatch?.categoryName === 'FOLHA';
      
      console.log(`📝 "${testCase.title}" -> ${categoryMatch?.categoryName || 'SEM CATEGORIA'} ${shouldBeFolha ? '✅' : '❌'}`);

      return {
        input: testCase,
        result: categoryMatch,
        isCorrect: shouldBeFolha
      };
    });

    const correctCount = results.filter(r => r.isCorrect).length;
    const accuracy = (correctCount / testCases.length) * 100;

    console.log(`📊 Acurácia para Folha: ${correctCount}/${testCases.length} (${accuracy}%)`);

    return {
      message: 'Teste de regex para Folha executado',
      results,
      summary: {
        totalTests: testCases.length,
        correctMatches: correctCount,
        accuracy: `${accuracy}%`
      }
    };
  }

  @Post('test-mapping')
  @Permission('bancos', 'ofx_imports', 'read')
  async testFolhaMapping() {
    console.log('🧪 === TESTE DE MAPEAMENTO FOLHA ===');

    // Simular transações com categoria FOLHA
    const mockTransactions = [
      {
        ofxImportId: 'test',
        title: 'VT ALIMENTACAO',
        description: 'Vale transporte',
        amount: 5000,
        type: 'DEBIT',
        transactionDate: new Date(),
        fitid: null,
        trntype: 'DEBIT',
        checknum: null,
        memo: 'VT',
        name: 'Vale transporte',
        suggestedCategoryId: 'FOLHA', // Nome que vem do regex
        confidence: 100
      }
    ];

    try {
      // Testar conversão de nome para ID
      const convertedTransactions = await this.bulkProcessor['convertCategoryNamesToIds'](mockTransactions);
      
      const original = mockTransactions[0];
      const converted = convertedTransactions[0];
      
      const wasConverted = original.suggestedCategoryId !== converted.suggestedCategoryId;
      const hasValidId = converted.suggestedCategoryId?.startsWith('cmd'); // IDs do sistema começam com cmd
      
      console.log(`📝 Original: "${original.suggestedCategoryId}"`);
      console.log(`📝 Convertido: "${converted.suggestedCategoryId}"`);
      console.log(`✅ Foi convertido: ${wasConverted}`);
      console.log(`✅ ID válido: ${hasValidId}`);

      return {
        message: 'Teste de mapeamento para Folha executado',
        original: original.suggestedCategoryId,
        converted: converted.suggestedCategoryId,
        wasConverted,
        hasValidId,
        success: wasConverted && hasValidId
      };

    } catch (error) {
      console.error('❌ Erro no teste de mapeamento:', error);
      return {
        message: 'Erro no teste de mapeamento',
        error: error.message
      };
    }
  }

  @Post('test-full-flow')
  @Permission('bancos', 'ofx_imports', 'read')
  async testFullFlow(@Body() body: { 
    title: string; 
    description: string;
    amount: number;
    type: string;
  }) {
    const { title, description, amount, type } = body;
    
    console.log(`🧪 === TESTE COMPLETO DO FLUXO ===`);
    console.log(`📝 Transação: "${title}" | "${description}" | ${amount} | ${type}`);
    
    // 1. Testar regex diretamente
    const categoryMatch = this.regexOptimization.findCategoryMatch('', description);
    const paymentMethodMatch = this.regexOptimization.findPaymentMethodMatch('', description);
    
    // 2. Testar via worker
    const mockTransaction = {
      TRNTYPE: type,
      DTPOSTED: '20240101',
      TRNAMT: amount.toString(),
      MEMO: title,
      NAME: description,
      FITID: 'TEST001',
      CHECKNUM: null
    };
    
    let workerResult: any = null;
    try {
      const workerResults = await this.clusterManager.processTransactionsInParallel(
        [mockTransaction],
        'test-import-id',
        'test-user-id'
      );
      workerResult = workerResults[0]?.categorizedTransactions[0] || null;
    } catch (error) {
      console.error(`❌ Erro no worker:`, error);
    }
    
    return {
      input: { title, description, amount, type },
      directRegex: {
        category: categoryMatch,
        paymentMethod: paymentMethodMatch
      },
      workerResult: workerResult,
      comparison: {
        categoryMatched: !!(categoryMatch && workerResult?.suggestedCategory),
        categoriesEqual: categoryMatch?.categoryName === workerResult?.suggestedCategory,
        confidenceEqual: categoryMatch?.confidence === workerResult?.categoryConfidence
      },
      message: 'Teste completo executado'
    };
  }
}