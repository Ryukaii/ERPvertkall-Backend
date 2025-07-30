import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  private isConnected = false;

  constructor() {
    super({
      datasources: {
        db: {
          url: process.env.DATABASE_URL || 'postgresql://erp_user:erp_password@localhost:5432/erp_vertkall?schema=public',
        },
      },
      // Connection pool configuration for better performance
      log: ['error', 'warn'],
    });

    // Add middleware for connection monitoring with performance tracking
    this.$use(async (params, next) => {
      const start = Date.now();
      try {
        const result = await next(params);
        const duration = Date.now() - start;
        
        // Only log slow queries (over 1000ms) or errors
        if (duration > 1000) {
          this.logger.warn(`Slow query detected: ${params.model}.${params.action} took ${duration}ms`);
        } else if (duration > 500) {
          this.logger.debug(`Query ${params.model}.${params.action} took ${duration}ms`);
        }
        
        return result;
      } catch (error) {
        const duration = Date.now() - start;
        this.logger.error(`Query ${params.model}.${params.action} failed after ${duration}ms: ${error.message}`);
        throw error;
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
} 