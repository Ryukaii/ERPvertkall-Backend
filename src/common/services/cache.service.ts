import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service';

interface CacheItem<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

@Injectable()
export class CacheService implements OnModuleInit {
  private readonly logger = new Logger(CacheService.name);
  
  // Cache em memória para categorias e métodos de pagamento
  private categoryCache = new Map<string, string>();
  private paymentMethodCache = new Map<string, string>();
  private userCache = new Map<string, any>();
  
  // Cache com TTL para dados que mudam com frequência
  private ttlCache = new Map<string, CacheItem<any>>();
  
  // Configurações
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutos
  private readonly CATEGORY_CACHE_TTL = 10 * 60 * 1000; // 10 minutos
  private readonly PAYMENT_METHOD_CACHE_TTL = 10 * 60 * 1000; // 10 minutos

  constructor(private prisma: PrismaService) {}

  async onModuleInit() {
    this.logger.log('🚀 Inicializando Cache Service');
    await this.initializeCache();
    
    // Atualizar cache periodicamente
    setInterval(() => this.updateCache(), this.CACHE_TTL);
  }

  /**
   * Inicializar cache com dados mais acessados
   */
  private async initializeCache() {
    try {
      this.logger.log('📊 Carregando cache inicial...');
      
      // Carregar categorias
      const categories = await this.prisma.financialCategory.findMany({
        select: { id: true, name: true, type: true }
      });
      
      categories.forEach(category => {
        this.categoryCache.set(category.name.toUpperCase(), category.id);
        this.categoryCache.set(category.id, category.name);
      });
      
      // Carregar métodos de pagamento
      const paymentMethods = await this.prisma.paymentMethod.findMany({
        where: { isActive: true },
        select: { id: true, name: true, type: true }
      });
      
      paymentMethods.forEach(method => {
        this.paymentMethodCache.set(method.name.toUpperCase(), method.id);
        this.paymentMethodCache.set(method.id, method.name);
      });
      
      this.logger.log(`✅ Cache inicializado: ${categories.length} categorias, ${paymentMethods.length} métodos de pagamento`);
      
    } catch (error) {
      this.logger.error('❌ Erro ao inicializar cache:', error);
    }
  }

  /**
   * Atualizar cache periodicamente
   */
  private async updateCache() {
    try {
      this.logger.debug('🔄 Atualizando cache...');
      
      // Limpar cache expirado
      this.clearExpiredCache();
      
      // Recarregar dados principais
      await this.initializeCache();
      
      this.logger.debug('✅ Cache atualizado');
      
    } catch (error) {
      this.logger.error('❌ Erro ao atualizar cache:', error);
    }
  }

  /**
   * Limpar cache expirado
   */
  private clearExpiredCache() {
    const now = Date.now();
    
    for (const [key, item] of this.ttlCache.entries()) {
      if (now - item.timestamp > item.ttl) {
        this.ttlCache.delete(key);
      }
    }
  }

  /**
   * Obter categoria por nome (com cache)
   */
  getCategoryId(name: string): string | undefined {
    return this.categoryCache.get(name.toUpperCase());
  }

  /**
   * Obter nome da categoria por ID (com cache)
   */
  getCategoryName(id: string): string | undefined {
    return this.categoryCache.get(id);
  }

  /**
   * Obter método de pagamento por nome (com cache)
   */
  getPaymentMethodId(name: string): string | undefined {
    return this.paymentMethodCache.get(name.toUpperCase());
  }

  /**
   * Obter nome do método de pagamento por ID (com cache)
   */
  getPaymentMethodName(id: string): string | undefined {
    return this.paymentMethodCache.get(id);
  }

  /**
   * Obter dados com TTL
   */
  get<T>(key: string): T | undefined {
    const item = this.ttlCache.get(key);
    
    if (!item) return undefined;
    
    const now = Date.now();
    if (now - item.timestamp > item.ttl) {
      this.ttlCache.delete(key);
      return undefined;
    }
    
    return item.data as T;
  }

  /**
   * Definir dados com TTL
   */
  set<T>(key: string, data: T, ttl: number = this.CACHE_TTL): void {
    this.ttlCache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  /**
   * Invalidar cache
   */
  invalidate(pattern: string): void {
    for (const key of this.ttlCache.keys()) {
      if (key.includes(pattern)) {
        this.ttlCache.delete(key);
      }
    }
  }

  /**
   * Limpar todo o cache
   */
  clear(): void {
    this.categoryCache.clear();
    this.paymentMethodCache.clear();
    this.userCache.clear();
    this.ttlCache.clear();
    this.logger.log('🧹 Cache limpo');
  }

  /**
   * Obter estatísticas do cache
   */
  getStats() {
    return {
      categoryCacheSize: this.categoryCache.size,
      paymentMethodCacheSize: this.paymentMethodCache.size,
      userCacheSize: this.userCache.size,
      ttlCacheSize: this.ttlCache.size,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Converter nomes para IDs em lote (otimizado)
   */
  convertCategoryNamesToIds(transactions: any[]): any[] {
    return transactions.map(tx => ({
      ...tx,
      suggestedCategoryId: tx.suggestedCategoryId ? 
        this.getCategoryId(tx.suggestedCategoryId) : undefined,
      finalCategoryId: tx.finalCategoryId ? 
        this.getCategoryId(tx.finalCategoryId) : undefined,
    }));
  }

  /**
   * Converter nomes de métodos de pagamento para IDs em lote (otimizado)
   */
  convertPaymentMethodNamesToIds(transactions: any[]): any[] {
    return transactions.map(tx => ({
      ...tx,
      suggestedPaymentMethodId: tx.suggestedPaymentMethodId ? 
        this.getPaymentMethodId(tx.suggestedPaymentMethodId) : undefined,
      finalPaymentMethodId: tx.finalPaymentMethodId ? 
        this.getPaymentMethodId(tx.finalPaymentMethodId) : undefined,
    }));
  }

  /**
   * Cache de usuário
   */
  getUser(userId: string): any | undefined {
    return this.userCache.get(userId);
  }

  /**
   * Definir usuário no cache
   */
  setUser(userId: string, userData: any): void {
    this.userCache.set(userId, userData);
  }

  /**
   * Invalidar cache de usuário
   */
  invalidateUser(userId: string): void {
    this.userCache.delete(userId);
  }
} 