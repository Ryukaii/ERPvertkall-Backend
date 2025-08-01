import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service';
import Redis from 'ioredis';

interface CacheItem<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

@Injectable()
export class RedisCacheService implements OnModuleInit {
  private readonly logger = new Logger(RedisCacheService.name);
  private redis: Redis;
  
  // Configurações
  private readonly DEFAULT_TTL = 5 * 60; // 5 minutos em segundos
  private readonly CATEGORY_CACHE_TTL = 10 * 60; // 10 minutos
  private readonly PAYMENT_METHOD_CACHE_TTL = 10 * 60; // 10 minutos
  private readonly USER_CACHE_TTL = 30 * 60; // 30 minutos
  private readonly TRANSACTION_CACHE_TTL = 2 * 60; // 2 minutos

  constructor(private prisma: PrismaService) {
    // Configurar Redis com connection pooling
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0'),
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      // Configurações de performance
      connectTimeout: 10000,
      commandTimeout: 5000,
    });

    // Event listeners para monitoramento
    this.redis.on('connect', () => {
      this.logger.log('✅ Redis conectado');
    });

    this.redis.on('error', (error) => {
      this.logger.error('❌ Erro no Redis:', error);
    });

    this.redis.on('ready', () => {
      this.logger.log('🚀 Redis pronto para uso');
    });
  }

  async onModuleInit() {
    this.logger.log('🚀 Inicializando Redis Cache Service');
    await this.initializeCache();
    
    // Atualizar cache periodicamente
    setInterval(() => this.updateCache(), this.DEFAULT_TTL * 1000);
  }

  /**
   * Inicializar cache com dados mais acessados
   */
  private async initializeCache() {
    try {
      this.logger.log('📊 Carregando cache inicial no Redis...');
      
      // Carregar categorias
      const categories = await this.prisma.financialCategory.findMany({
        select: { id: true, name: true, type: true }
      });
      
      const categoryData = categories.reduce((acc, category) => {
        acc[`category:${category.name.toUpperCase()}`] = category.id;
        acc[`category:${category.id}`] = category.name;
        return acc;
      }, {} as Record<string, string>);
      
      // Salvar categorias no Redis com pipeline para performance
      const pipeline = this.redis.pipeline();
      Object.entries(categoryData).forEach(([key, value]) => {
        pipeline.setex(key, this.CATEGORY_CACHE_TTL, value);
      });
      await pipeline.exec();
      
      // Carregar métodos de pagamento
      const paymentMethods = await this.prisma.paymentMethod.findMany({
        where: { isActive: true },
        select: { id: true, name: true, type: true }
      });
      
      const paymentMethodData = paymentMethods.reduce((acc, method) => {
        acc[`payment_method:${method.name.toUpperCase()}`] = method.id;
        acc[`payment_method:${method.id}`] = method.name;
        return acc;
      }, {} as Record<string, string>);
      
      // Salvar métodos de pagamento no Redis
      const paymentPipeline = this.redis.pipeline();
      Object.entries(paymentMethodData).forEach(([key, value]) => {
        paymentPipeline.setex(key, this.PAYMENT_METHOD_CACHE_TTL, value);
      });
      await paymentPipeline.exec();
      
      this.logger.log(`✅ Cache inicializado: ${categories.length} categorias, ${paymentMethods.length} métodos de pagamento`);
      
    } catch (error) {
      this.logger.error('❌ Erro ao inicializar cache no Redis:', error);
    }
  }

  /**
   * Atualizar cache periodicamente
   */
  private async updateCache() {
    try {
      this.logger.debug('🔄 Atualizando cache no Redis...');
      
      // Limpar cache expirado (Redis faz isso automaticamente)
      await this.redis.eval(`
        local keys = redis.call('keys', 'expired:*')
        if #keys > 0 then
          redis.call('del', unpack(keys))
        end
      `, 0);
      
      // Recarregar dados principais
      await this.initializeCache();
      
      this.logger.debug('✅ Cache atualizado no Redis');
      
    } catch (error) {
      this.logger.error('❌ Erro ao atualizar cache no Redis:', error);
    }
  }

  /**
   * Obter categoria por nome (com cache Redis)
   */
  async getCategoryId(name: string): Promise<string | null> {
    try {
      const key = `category:${name.toUpperCase()}`;
      return await this.redis.get(key);
    } catch (error) {
      this.logger.error('Erro ao buscar categoria no Redis:', error);
      return null;
    }
  }

  /**
   * Obter nome da categoria por ID (com cache Redis)
   */
  async getCategoryName(id: string): Promise<string | null> {
    try {
      const key = `category:${id}`;
      return await this.redis.get(key);
    } catch (error) {
      this.logger.error('Erro ao buscar nome da categoria no Redis:', error);
      return null;
    }
  }

  /**
   * Obter método de pagamento por nome (com cache Redis)
   */
  async getPaymentMethodId(name: string): Promise<string | null> {
    try {
      const key = `payment_method:${name.toUpperCase()}`;
      return await this.redis.get(key);
    } catch (error) {
      this.logger.error('Erro ao buscar método de pagamento no Redis:', error);
      return null;
    }
  }

  /**
   * Obter nome do método de pagamento por ID (com cache Redis)
   */
  async getPaymentMethodName(id: string): Promise<string | null> {
    try {
      const key = `payment_method:${id}`;
      return await this.redis.get(key);
    } catch (error) {
      this.logger.error('Erro ao buscar nome do método de pagamento no Redis:', error);
      return null;
    }
  }

  /**
   * Obter dados com TTL do Redis
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const data = await this.redis.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      this.logger.error('Erro ao buscar dados no Redis:', error);
      return null;
    }
  }

  /**
   * Definir dados com TTL no Redis
   */
  async set<T>(key: string, data: T, ttl: number = this.DEFAULT_TTL): Promise<void> {
    try {
      await this.redis.setex(key, ttl, JSON.stringify(data));
    } catch (error) {
      this.logger.error('Erro ao salvar dados no Redis:', error);
    }
  }

  /**
   * Invalidar cache por padrão
   */
  async invalidate(pattern: string): Promise<void> {
    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
        this.logger.debug(`Invalidados ${keys.length} itens do cache`);
      }
    } catch (error) {
      this.logger.error('Erro ao invalidar cache no Redis:', error);
    }
  }

  /**
   * Limpar todo o cache
   */
  async clear(): Promise<void> {
    try {
      await this.redis.flushdb();
      this.logger.log('🧹 Cache Redis limpo');
    } catch (error) {
      this.logger.error('Erro ao limpar cache no Redis:', error);
    }
  }

  /**
   * Obter estatísticas do cache Redis
   */
  async getStats() {
    try {
      const info = await this.redis.info();
      const keys = await this.redis.dbsize();
      
      return {
        keys,
        info: info.split('\r\n').reduce((acc, line) => {
          const [key, value] = line.split(':');
          if (key && value) acc[key] = value;
          return acc;
        }, {} as Record<string, string>),
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      this.logger.error('Erro ao obter estatísticas do Redis:', error);
      return { error: error.message };
    }
  }

  /**
   * Cache de usuário no Redis
   */
  async getUser(userId: string): Promise<any | null> {
    try {
      const key = `user:${userId}`;
      const data = await this.redis.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      this.logger.error('Erro ao buscar usuário no Redis:', error);
      return null;
    }
  }

  /**
   * Definir usuário no cache Redis
   */
  async setUser(userId: string, userData: any): Promise<void> {
    try {
      const key = `user:${userId}`;
      await this.redis.setex(key, this.USER_CACHE_TTL, JSON.stringify(userData));
    } catch (error) {
      this.logger.error('Erro ao salvar usuário no Redis:', error);
    }
  }

  /**
   * Invalidar cache de usuário
   */
  async invalidateUser(userId: string): Promise<void> {
    try {
      const key = `user:${userId}`;
      await this.redis.del(key);
    } catch (error) {
      this.logger.error('Erro ao invalidar usuário no Redis:', error);
    }
  }

  /**
   * Cache de transações com paginação cursor-based
   */
  async getTransactionsCache(userId: string, filters: any, cursor?: string): Promise<any | null> {
    try {
      const key = `transactions:${userId}:${JSON.stringify(filters)}:${cursor || 'first'}`;
      return await this.get(key);
    } catch (error) {
      this.logger.error('Erro ao buscar cache de transações:', error);
      return null;
    }
  }

  /**
   * Salvar cache de transações
   */
  async setTransactionsCache(userId: string, filters: any, data: any, cursor?: string): Promise<void> {
    try {
      const key = `transactions:${userId}:${JSON.stringify(filters)}:${cursor || 'first'}`;
      await this.set(key, data, this.TRANSACTION_CACHE_TTL);
    } catch (error) {
      this.logger.error('Erro ao salvar cache de transações:', error);
    }
  }

  /**
   * Cache de dashboard/sumários
   */
  async getDashboardCache(userId: string, period: string): Promise<any | null> {
    try {
      const key = `dashboard:${userId}:${period}`;
      return await this.get(key);
    } catch (error) {
      this.logger.error('Erro ao buscar cache do dashboard:', error);
      return null;
    }
  }

  /**
   * Salvar cache do dashboard
   */
  async setDashboardCache(userId: string, period: string, data: any): Promise<void> {
    try {
      const key = `dashboard:${userId}:${period}`;
      await this.set(key, data, this.DEFAULT_TTL);
    } catch (error) {
      this.logger.error('Erro ao salvar cache do dashboard:', error);
    }
  }

  /**
   * Converter nomes para IDs em lote (otimizado com Redis)
   */
  async convertCategoryNamesToIds(transactions: any[]): Promise<any[]> {
    try {
      const pipeline = this.redis.pipeline();
      const categoryKeys = transactions
        .filter(tx => tx.suggestedCategoryId || tx.finalCategoryId)
        .map(tx => tx.suggestedCategoryId || tx.finalCategoryId)
        .filter(Boolean)
        .map(name => `category:${name.toUpperCase()}`);

      if (categoryKeys.length > 0) {
        categoryKeys.forEach(key => pipeline.get(key));
        const results = await pipeline.exec();
        
        const categoryMap = new Map();
        results?.forEach((result, index) => {
          if (result[0] === null && result[1]) {
            categoryMap.set(categoryKeys[index], result[1]);
          }
        });

        return transactions.map(tx => ({
          ...tx,
          suggestedCategoryId: tx.suggestedCategoryId ? 
            categoryMap.get(`category:${tx.suggestedCategoryId.toUpperCase()}`) || tx.suggestedCategoryId : undefined,
          finalCategoryId: tx.finalCategoryId ? 
            categoryMap.get(`category:${tx.finalCategoryId.toUpperCase()}`) || tx.finalCategoryId : undefined,
        }));
      }
      
      return transactions;
    } catch (error) {
      this.logger.error('Erro ao converter categorias em lote:', error);
      return transactions;
    }
  }

  /**
   * Converter nomes de métodos de pagamento para IDs em lote (otimizado com Redis)
   */
  async convertPaymentMethodNamesToIds(transactions: any[]): Promise<any[]> {
    try {
      const pipeline = this.redis.pipeline();
      const paymentMethodKeys = transactions
        .filter(tx => tx.suggestedPaymentMethodId || tx.finalPaymentMethodId)
        .map(tx => tx.suggestedPaymentMethodId || tx.finalPaymentMethodId)
        .filter(Boolean)
        .map(name => `payment_method:${name.toUpperCase()}`);

      if (paymentMethodKeys.length > 0) {
        paymentMethodKeys.forEach(key => pipeline.get(key));
        const results = await pipeline.exec();
        
        const paymentMethodMap = new Map();
        results?.forEach((result, index) => {
          if (result[0] === null && result[1]) {
            paymentMethodMap.set(paymentMethodKeys[index], result[1]);
          }
        });

        return transactions.map(tx => ({
          ...tx,
          suggestedPaymentMethodId: tx.suggestedPaymentMethodId ? 
            paymentMethodMap.get(`payment_method:${tx.suggestedPaymentMethodId.toUpperCase()}`) || tx.suggestedPaymentMethodId : undefined,
          finalPaymentMethodId: tx.finalPaymentMethodId ? 
            paymentMethodMap.get(`payment_method:${tx.finalPaymentMethodId.toUpperCase()}`) || tx.finalPaymentMethodId : undefined,
        }));
      }
      
      return transactions;
    } catch (error) {
      this.logger.error('Erro ao converter métodos de pagamento em lote:', error);
      return transactions;
    }
  }

  /**
   * Health check do Redis
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.redis.ping();
      return true;
    } catch (error) {
      this.logger.error('Redis health check falhou:', error);
      return false;
    }
  }

  /**
   * Fechar conexão Redis
   */
  async onModuleDestroy() {
    if (this.redis) {
      await this.redis.quit();
      this.logger.log('Redis desconectado');
    }
  }
} 