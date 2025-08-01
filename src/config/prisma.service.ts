import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  private isConnected = false;
  private activeConnections = 0;

  constructor() {
    const isProduction = process.env.NODE_ENV === 'production';
    const databaseUrl = isProduction 
      ? PrismaService.buildProductionUrl(process.env.DATABASE_URL)
      : process.env.DATABASE_URL || 'postgresql://erp_user:erp_password@localhost:5432/erp_vertkall?schema=public';

    super({
      datasources: {
        db: {
          url: databaseUrl,
        },
      },
      // Configuration optimized for Supabase/Heroku production
      log: isProduction ? ['error'] : ['error', 'warn'],
      errorFormat: 'pretty',
    });

    // Add middleware for connection monitoring with performance tracking
    this.$use(async (params, next) => {
      const start = Date.now();
      this.activeConnections++;
      
      // Log high connection usage
      if (this.activeConnections > 7) {
        this.logger.warn(`High connection usage detected: ${this.activeConnections} active connections`);
      }
      
      try {
        const result = await next(params);
        const duration = Date.now() - start;
        
        // Only log slow queries (over 500ms in production, 1000ms in development)
        const slowThreshold = isProduction ? 500 : 1000;
        if (duration > slowThreshold) {
          this.logger.warn(`Slow query detected: ${params.model}.${params.action} took ${duration}ms (${this.activeConnections} active connections)`);
        } else if (duration > 200 && !isProduction) {
          this.logger.debug(`Query ${params.model}.${params.action} took ${duration}ms (${this.activeConnections} active connections)`);
        }
        
        return result;
      } catch (error) {
        const duration = Date.now() - start;
        
        // Special handling for connection pool timeouts
        if (error.code === 'P2024') {
          this.logger.error(`Connection pool timeout: ${params.model}.${params.action} failed after ${duration}ms with ${this.activeConnections} active connections. Pool exhausted!`);
        } else {
          this.logger.error(`Query ${params.model}.${params.action} failed after ${duration}ms: ${error.message}`);
        }
        throw error;
      } finally {
        this.activeConnections--;
      }
    });
  }

  async onModuleInit() {
    try {
      await this.$connect();
      this.isConnected = true;
      this.logger.log('✅ Database connected successfully');
    } catch (error) {
      this.logger.error('❌ Failed to connect to database:', error);
      throw error;
    }
  }

  async onModuleDestroy() {
    try {
      await this.$disconnect();
      this.isConnected = false;
      this.logger.log('✅ Database disconnected successfully');
    } catch (error) {
      this.logger.error('❌ Error disconnecting from database:', error);
    }
  }

  // Helper method to check connection status
  getConnectionStatus(): boolean {
    return this.isConnected;
  }

  // Helper method to handle connection errors with retry logic
  async executeWithRetry<T>(operation: () => Promise<T>, maxRetries = 3): Promise<T> {
    let lastError: Error | undefined;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        
        // If it's a connection pool error, wait before retrying
        if (error.code === 'P2024') {
          this.logger.warn(`Connection pool timeout (attempt ${attempt}/${maxRetries}), retrying...`);
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); // Exponential backoff
          continue;
        }
        
        // For other errors, don't retry
        throw error;
      }
    }
    
    // This should never be reached if maxRetries > 0, but TypeScript needs this check
    if (lastError) {
      throw lastError;
    }
    
    throw new Error('Operation failed after all retry attempts');
  }

  // Override findUnique to include retry logic
  async findUniqueWithRetry(model: any, args: any) {
    return this.executeWithRetry(() => model.findUnique(args));
  }

  // Build production URL with Supabase-specific configurations
  private static buildProductionUrl(baseUrl?: string): string {
    if (!baseUrl) return 'postgresql://erp_user:erp_password@localhost:5432/erp_vertkall?schema=public';
    
    // Parse the URL to add Supabase-specific parameters
    const url = new URL(baseUrl);
    
    // Add Supabase-specific query parameters for better stability
    url.searchParams.set('pgbouncer', 'true');
    url.searchParams.set('connection_limit', '3'); // Reduced from 10 to 3 for better stability
    url.searchParams.set('pool_timeout', '20'); // Reduced from 60 to 20 seconds
    url.searchParams.set('statement_cache_size', '0'); // Disable prepared statements
    url.searchParams.set('prepared_statements', 'false');
    url.searchParams.set('schema', 'public');
    url.searchParams.set('idle_in_transaction_session_timeout', '30000'); // 30 seconds
    url.searchParams.set('statement_timeout', '30000'); // 30 seconds
    
    return url.toString();
  }

  // Connection health check
  async isHealthy(): Promise<boolean> {
    try {
      await this.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      this.logger.error('Database health check failed:', error);
      return false;
    }
  }

  // Graceful reconnection method
  async reconnect(): Promise<void> {
    try {
      this.logger.log('Attempting database reconnection...');
      await this.$disconnect();
      await this.$connect();
      this.isConnected = true;
      this.logger.log('✅ Database reconnected successfully');
    } catch (error) {
      this.logger.error('❌ Failed to reconnect to database:', error);
      throw error;
    }
  }

  // Optimized query methods for common operations
  async findManyOptimized(model: any, args: any, options?: {
    useRetry?: boolean;
    maxRetries?: number;
  }) {
    const { useRetry = true, maxRetries = 2 } = options || {};
    
    if (useRetry) {
      return this.executeWithRetry(() => model.findMany(args), maxRetries);
    }
    
    return model.findMany(args);
  }

  // Batch operations for better performance
  async batchOperation<T>(operations: (() => Promise<T>)[]): Promise<T[]> {
    const results: T[] = [];
    
    for (const operation of operations) {
      try {
        const result = await this.executeWithRetry(operation);
        results.push(result);
      } catch (error) {
        this.logger.error('Batch operation failed:', error);
        throw error;
      }
    }
    
    return results;
  }

  // Connection pool monitoring
  getPoolStatus() {
    return {
      activeConnections: this.activeConnections,
      isConnected: this.isConnected,
      timestamp: new Date().toISOString(),
    };
  }

  // Log connection pool status
  logPoolStatus() {
    const status = this.getPoolStatus();
    this.logger.log(`Pool Status: ${JSON.stringify(status)}`);
  }
} 