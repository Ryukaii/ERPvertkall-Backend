import { Injectable, Logger } from '@nestjs/common';
import { Worker } from 'worker_threads';
import { join } from 'path';

export interface OfxWorkload {
  id: string;
  transactions: any[];
  importId: string;
  userId: string;
  chunkIndex: number;
  totalChunks: number;
}

export interface OfxWorkerResult {
  id: string;
  success: boolean;
  processedCount: number;
  errors: string[];
  chunkIndex: number;
  categorizedTransactions: any[];
}

@Injectable()
export class OfxClusterManager {
  private readonly logger = new Logger(OfxClusterManager.name);
  private readonly workers: Worker[] = [];
  private readonly workQueue: OfxWorkload[] = [];
  private readonly activeJobs = new Map<string, {
    resolve: (value: OfxWorkerResult[]) => void;
    reject: (error: Error) => void;
    results: OfxWorkerResult[];
    expectedChunks: number;
  }>();
  
  private readonly WORKER_COUNT = 2; // Usar 2 workers conforme solicitado
  private isInitialized = false;

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    this.logger.log(`🚀 Inicializando cluster OFX com ${this.WORKER_COUNT} workers`);

    const workerPath = join(__dirname, 'ofx-worker.js');

    // Criar workers
    for (let i = 0; i < this.WORKER_COUNT; i++) {
      const worker = new Worker(workerPath, {
        workerData: { workerId: i }
      });

      worker.on('message', (result: OfxWorkerResult) => {
        this.handleWorkerResult(result);
      });

      worker.on('error', (error) => {
        this.logger.error(`❌ Worker ${i} erro:`, error);
        this.handleWorkerError(error);
      });

      worker.on('exit', (code) => {
        if (code !== 0) {
          this.logger.error(`❌ Worker ${i} saiu com código ${code}`);
        }
      });

      this.workers.push(worker);
      this.logger.log(`✅ Worker ${i} inicializado`);
    }

    this.isInitialized = true;
    this.logger.log(`🎯 Cluster OFX inicializado com sucesso`);
  }

  async processTransactionsInParallel(
    transactions: any[],
    importId: string,
    userId: string
  ): Promise<OfxWorkerResult[]> {
    await this.initialize();

    const jobId = `${importId}-${Date.now()}`;
    this.logger.log(`📊 Iniciando processamento paralelo: ${jobId}`);
    this.logger.log(`📊 Total de transações: ${transactions.length}`);

    // Dividir transações em chunks para os workers
    const chunkSize = Math.ceil(transactions.length / this.WORKER_COUNT);
    const chunks = this.chunkArray(transactions, chunkSize);
    
    this.logger.log(`📊 Dividido em ${chunks.length} chunks de ~${chunkSize} transações`);

    // Criar promise para aguardar todos os resultados
    const jobPromise = new Promise<OfxWorkerResult[]>((resolve, reject) => {
      this.activeJobs.set(jobId, {
        resolve,
        reject,
        results: [],
        expectedChunks: chunks.length
      });
    });

    // Distribuir chunks para workers
    chunks.forEach((chunk, index) => {
      const workload: OfxWorkload = {
        id: jobId,
        transactions: chunk,
        importId,
        userId,
        chunkIndex: index,
        totalChunks: chunks.length
      };

      this.assignWorkToWorker(workload);
    });

    return jobPromise;
  }

  private assignWorkToWorker(workload: OfxWorkload): void {
    // Encontrar worker disponível (simple round-robin)
    const workerIndex = workload.chunkIndex % this.workers.length;
    const worker = this.workers[workerIndex];
    
    this.logger.log(`🔄 Atribuindo chunk ${workload.chunkIndex} para worker ${workerIndex}`);
    worker.postMessage(workload);
  }

  private handleWorkerResult(result: OfxWorkerResult): void {
    this.logger.log(`✅ Resultado recebido do chunk ${result.chunkIndex}: ${result.processedCount} processadas`);
    
    const job = this.activeJobs.get(result.id);
    if (!job) {
      this.logger.warn(`⚠️ Job não encontrado: ${result.id}`);
      return;
    }

    job.results.push(result);

    // Verificar se todos os chunks foram processados
    if (job.results.length === job.expectedChunks) {
      // Ordenar resultados por chunkIndex
      job.results.sort((a, b) => a.chunkIndex - b.chunkIndex);
      
      this.logger.log(`🎯 Job completo: ${result.id}`);
      this.logger.log(`📊 Total processado: ${job.results.reduce((sum, r) => sum + r.processedCount, 0)}`);
      
      job.resolve(job.results);
      this.activeJobs.delete(result.id);
    }
  }

  private handleWorkerError(error: Error): void {
    // Rejeitar todos os jobs ativos em caso de erro crítico
    for (const [jobId, job] of this.activeJobs.entries()) {
      job.reject(new Error(`Worker error: ${error.message}`));
      this.activeJobs.delete(jobId);
    }
  }

  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  async shutdown(): Promise<void> {
    this.logger.log('🔄 Finalizando cluster OFX...');
    
    // Terminar todos os workers
    await Promise.all(
      this.workers.map(worker => worker.terminate())
    );
    
    this.workers.length = 0;
    this.isInitialized = false;
    
    this.logger.log('✅ Cluster OFX finalizado');
  }

  getStats() {
    return {
      workerCount: this.WORKER_COUNT,
      isInitialized: this.isInitialized,
      activeJobs: this.activeJobs.size,
      queueSize: this.workQueue.length
    };
  }
}