import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service';
import { RedisCacheService } from '../../common/services/redis-cache.service';
import { CreateFinancialTransactionDto } from './dto/create-financial-transaction.dto';
import { UpdateFinancialTransactionDto } from './dto/update-financial-transaction.dto';
import { FilterFinancialTransactionDto } from './dto/filter-financial-transaction.dto';
import { FinancialTransactionType, FinancialTransactionStatus } from '@prisma/client';

export interface PaginationResult<T> {
  data: T[];
  nextCursor?: string;
  hasMore: boolean;
  total: number;
}

@Injectable()
export class FinancialTransactionService {
  private readonly logger = new Logger(FinancialTransactionService.name);

  constructor(
    private prisma: PrismaService,
    private cacheService: RedisCacheService,
  ) {}

  /**
   * Criar transação financeira com cache invalidation
   */
  async create(createDto: CreateFinancialTransactionDto, userId: string) {
    try {
      const transaction = await this.prisma.financialTransaction.create({
        data: {
          ...createDto,
          userId,
        },
        include: {
          category: true,
          paymentMethod: true,
          bank: true,
          tags: {
            include: {
              tag: true,
            },
          },
        },
      });

      // Invalidar cache relacionado
      await this.invalidateUserCache(userId);
      
      this.logger.log(`✅ Transação criada: ${transaction.id}`);
      return transaction;
    } catch (error) {
      this.logger.error('Erro ao criar transação:', error);
      throw new BadRequestException('Erro ao criar transação financeira');
    }
  }

  /**
   * Buscar transações com paginação cursor-based otimizada
   */
  async findAll(
    userId: string,
    filters: FilterFinancialTransactionDto,
    cursor?: string,
    limit: number = 50,
  ): Promise<PaginationResult<any>> {
    try {
      // Verificar cache primeiro
      const cacheKey = `transactions:${userId}:${JSON.stringify(filters)}:${cursor || 'first'}`;
      const cached = await this.cacheService.get<PaginationResult<any>>(cacheKey);
      
      if (cached) {
        this.logger.debug('📦 Retornando dados do cache');
        return cached;
      }

      // Construir where clause otimizada
      const where = this.buildWhereClause(userId, filters);

      // Query otimizada com select específico
      const transactions = await this.prisma.financialTransaction.findMany({
        where,
        select: {
          id: true,
          title: true,
          description: true,
          amount: true,
          dueDate: true,
          paidDate: true,
          type: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          isRecurring: true,
          transactionDate: true,
          category: {
            select: {
              id: true,
              name: true,
              color: true,
            },
          },
          paymentMethod: {
            select: {
              id: true,
              name: true,
              type: true,
            },
          },
          bank: {
            select: {
              id: true,
              name: true,
              accountNumber: true,
            },
          },
          tags: {
            select: {
              tag: {
                select: {
                  id: true,
                  name: true,
                  color: true,
                },
              },
            },
          },
        },
        take: limit + 1, // Pegar um extra para verificar se há mais
        ...(cursor && { cursor: { id: cursor } }),
        orderBy: { id: 'asc' }, // Ordenação consistente para cursor
      });

      // Verificar se há mais dados
      const hasMore = transactions.length > limit;
      const data = hasMore ? transactions.slice(0, limit) : transactions;
      const nextCursor = hasMore ? data[data.length - 1]?.id : undefined;

      // Contar total (otimizado com cache)
      const total = await this.getTotalCount(userId, filters);

      const result: PaginationResult<any> = {
        data,
        nextCursor,
        hasMore,
        total,
      };

      // Salvar no cache
      await this.cacheService.set(cacheKey, result, 2 * 60); // 2 minutos

      return result;
    } catch (error) {
      this.logger.error('Erro ao buscar transações:', error);
      throw new BadRequestException('Erro ao buscar transações');
    }
  }

  /**
   * Buscar transação por ID com cache
   */
  async findOne(id: string, userId: string) {
    try {
      // Verificar cache
      const cacheKey = `transaction:${id}:${userId}`;
      const cached = await this.cacheService.get(cacheKey);
      
      if (cached) {
        return cached;
      }

      const transaction = await this.prisma.financialTransaction.findFirst({
        where: { id, userId },
        include: {
          category: true,
          paymentMethod: true,
          bank: true,
          tags: {
            include: {
              tag: true,
            },
          },
          linkedTransaction: true,
          linkedTransactions: true,
          originalTransaction: true,
          recurringTransactions: true,
        },
      });

      if (!transaction) {
        throw new NotFoundException('Transação não encontrada');
      }

      // Salvar no cache
      await this.cacheService.set(cacheKey, transaction, 5 * 60); // 5 minutos

      return transaction;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.logger.error('Erro ao buscar transação:', error);
      throw new BadRequestException('Erro ao buscar transação');
    }
  }

  /**
   * Atualizar transação com cache invalidation
   */
  async update(id: string, updateDto: UpdateFinancialTransactionDto, userId: string) {
    try {
      const transaction = await this.prisma.financialTransaction.findFirst({
        where: { id, userId },
      });

      if (!transaction) {
        throw new NotFoundException('Transação não encontrada');
      }

      const updatedTransaction = await this.prisma.financialTransaction.update({
        where: { id },
        data: updateDto,
        include: {
          category: true,
          paymentMethod: true,
          bank: true,
          tags: {
            include: {
              tag: true,
            },
          },
        },
      });

      // Invalidar cache relacionado
      await this.invalidateUserCache(userId);
      await this.cacheService.invalidate(`transaction:${id}:*`);

      this.logger.log(`✅ Transação atualizada: ${id}`);
      return updatedTransaction;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.logger.error('Erro ao atualizar transação:', error);
      throw new BadRequestException('Erro ao atualizar transação');
    }
  }

  /**
   * Remover transação com cache invalidation
   */
  async remove(id: string, userId: string) {
    try {
      const transaction = await this.prisma.financialTransaction.findFirst({
        where: { id, userId },
      });

      if (!transaction) {
        throw new NotFoundException('Transação não encontrada');
      }

      await this.prisma.financialTransaction.delete({
        where: { id },
      });

      // Invalidar cache relacionado
      await this.invalidateUserCache(userId);
      await this.cacheService.invalidate(`transaction:${id}:*`);

      this.logger.log(`✅ Transação removida: ${id}`);
      return { message: 'Transação removida com sucesso' };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.logger.error('Erro ao remover transação:', error);
      throw new BadRequestException('Erro ao remover transação');
    }
  }

  /**
   * Buscar resumo de transações com cache otimizado
   */
  async getSummary(userId: string, period: string = 'month') {
    try {
      // Verificar cache
      const cacheKey = `summary:${userId}:${period}`;
      const cached = await this.cacheService.get(cacheKey);
      
      if (cached) {
        return cached;
      }

      const dateFilter = this.getDateFilter(period);

      const [totalIncome, totalExpense, totalBalance, pendingCount, overdueCount] = await Promise.all([
        this.prisma.financialTransaction.aggregate({
          where: {
            userId,
            type: FinancialTransactionType.RECEIVABLE,
            ...dateFilter,
          },
          _sum: { amount: true },
        }),
        this.prisma.financialTransaction.aggregate({
          where: {
            userId,
            type: FinancialTransactionType.PAYABLE,
            ...dateFilter,
          },
          _sum: { amount: true },
        }),
        this.prisma.financialTransaction.aggregate({
          where: {
            userId,
            ...dateFilter,
          },
          _sum: { amount: true },
        }),
        this.prisma.financialTransaction.count({
          where: {
            userId,
            status: FinancialTransactionStatus.PENDING,
            ...dateFilter,
          },
        }),
        this.prisma.financialTransaction.count({
          where: {
            userId,
            status: FinancialTransactionStatus.OVERDUE,
            ...dateFilter,
          },
        }),
      ]);

      const summary = {
        totalIncome: totalIncome._sum.amount || 0,
        totalExpense: totalExpense._sum.amount || 0,
        totalBalance: totalBalance._sum.amount || 0,
        pendingCount,
        overdueCount,
        period,
      };

      // Salvar no cache
      await this.cacheService.set(cacheKey, summary, 5 * 60); // 5 minutos

      return summary;
    } catch (error) {
      this.logger.error('Erro ao buscar resumo:', error);
      throw new BadRequestException('Erro ao buscar resumo');
    }
  }

  /**
   * Buscar resumo do dashboard
   */
  async getDashboardSummary(userId: string, startDate?: string, endDate?: string, isAdmin?: boolean) {
    try {
      const dateFilter = {
        ...(startDate && { gte: new Date(startDate) }),
        ...(endDate && { lte: new Date(endDate) }),
      };

      const [totalIncome, totalExpense, pendingCount, overdueCount] = await Promise.all([
        this.prisma.financialTransaction.aggregate({
          where: {
            userId,
            type: FinancialTransactionType.RECEIVABLE,
            ...(Object.keys(dateFilter).length > 0 && { transactionDate: dateFilter }),
          },
          _sum: { amount: true },
        }),
        this.prisma.financialTransaction.aggregate({
          where: {
            userId,
            type: FinancialTransactionType.PAYABLE,
            ...(Object.keys(dateFilter).length > 0 && { transactionDate: dateFilter }),
          },
          _sum: { amount: true },
        }),
        this.prisma.financialTransaction.count({
          where: {
            userId,
            status: FinancialTransactionStatus.PENDING,
            ...(Object.keys(dateFilter).length > 0 && { transactionDate: dateFilter }),
          },
        }),
        this.prisma.financialTransaction.count({
          where: {
            userId,
            status: FinancialTransactionStatus.OVERDUE,
            ...(Object.keys(dateFilter).length > 0 && { transactionDate: dateFilter }),
          },
        }),
      ]);

      return {
        totalIncome: totalIncome._sum.amount || 0,
        totalExpense: totalExpense._sum.amount || 0,
        pendingCount,
        overdueCount,
        period: { startDate, endDate },
      };
    } catch (error) {
      this.logger.error('Erro ao buscar resumo do dashboard:', error);
      throw new BadRequestException('Erro ao buscar resumo do dashboard');
    }
  }

  /**
   * Marcar transação como paga
   */
  async markAsPaid(id: string, userId: string, paidDate?: string) {
    try {
      const transaction = await this.prisma.financialTransaction.findFirst({
        where: { id, userId },
      });

      if (!transaction) {
        throw new NotFoundException('Transação não encontrada');
      }

      const updatedTransaction = await this.prisma.financialTransaction.update({
        where: { id },
        data: {
          status: FinancialTransactionStatus.PAID,
          paidDate: paidDate ? new Date(paidDate) : new Date(),
        },
        include: {
          category: true,
          paymentMethod: true,
          bank: true,
        },
      });

      // Invalidar cache relacionado
      await this.invalidateUserCache(userId);

      this.logger.log(`✅ Transação marcada como paga: ${id}`);
      return updatedTransaction;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.logger.error('Erro ao marcar transação como paga:', error);
      throw new BadRequestException('Erro ao marcar transação como paga');
    }
  }

  /**
   * Marcar transações vencidas como overdue
   */
  async markAsOverdue(userId: string) {
    try {
      const today = new Date();
      const overdueTransactions = await this.prisma.financialTransaction.findMany({
        where: {
          userId,
          status: FinancialTransactionStatus.PENDING,
          dueDate: { lt: today },
        },
      });

      if (overdueTransactions.length > 0) {
        await this.prisma.financialTransaction.updateMany({
          where: {
            userId,
            status: FinancialTransactionStatus.PENDING,
            dueDate: { lt: today },
          },
          data: {
            status: FinancialTransactionStatus.OVERDUE,
          },
        });
      }

      // Invalidar cache relacionado
      await this.invalidateUserCache(userId);

      this.logger.log(`✅ ${overdueTransactions.length} transações marcadas como vencidas`);
      return { 
        message: `${overdueTransactions.length} transações marcadas como vencidas`,
        count: overdueTransactions.length 
      };
    } catch (error) {
      this.logger.error('Erro ao marcar transações como vencidas:', error);
      throw new BadRequestException('Erro ao marcar transações como vencidas');
    }
  }

  /**
   * Tornar transação recorrente
   */
  async makeRecurring(id: string, makeRecurringDto: any, userId: string) {
    try {
      const transaction = await this.prisma.financialTransaction.findFirst({
        where: { id, userId },
      });

      if (!transaction) {
        throw new NotFoundException('Transação não encontrada');
      }

      const updatedTransaction = await this.prisma.financialTransaction.update({
        where: { id },
        data: {
          isRecurring: true,
          recurrenceInterval: makeRecurringDto.interval || 'monthly',
          recurrenceEndDate: makeRecurringDto.endDate ? new Date(makeRecurringDto.endDate) : null,
        },
        include: {
          category: true,
          paymentMethod: true,
          bank: true,
        },
      });

      // Invalidar cache relacionado
      await this.invalidateUserCache(userId);

      this.logger.log(`✅ Transação tornada recorrente: ${id}`);
      return updatedTransaction;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.logger.error('Erro ao tornar transação recorrente:', error);
      throw new BadRequestException('Erro ao tornar transação recorrente');
    }
  }

  /**
   * Buscar transações por categoria com cache
   */
  async findByCategory(userId: string, categoryId: string, cursor?: string, limit: number = 50) {
    try {
      const cacheKey = `transactions:category:${userId}:${categoryId}:${cursor || 'first'}`;
      const cached = await this.cacheService.get(cacheKey);
      
      if (cached) {
        return cached;
      }

      const transactions = await this.prisma.financialTransaction.findMany({
        where: {
          userId,
          categoryId,
        },
        select: {
          id: true,
          title: true,
          amount: true,
          type: true,
          status: true,
          dueDate: true,
          createdAt: true,
        },
        take: limit + 1,
        ...(cursor && { cursor: { id: cursor } }),
        orderBy: { id: 'asc' },
      });

      const hasMore = transactions.length > limit;
      const data = hasMore ? transactions.slice(0, limit) : transactions;
      const nextCursor = hasMore ? data[data.length - 1]?.id : undefined;

      const result = {
        data,
        nextCursor,
        hasMore,
        categoryId,
      };

      await this.cacheService.set(cacheKey, result, 2 * 60);
      return result;
    } catch (error) {
      this.logger.error('Erro ao buscar transações por categoria:', error);
      throw new BadRequestException('Erro ao buscar transações por categoria');
    }
  }

  /**
   * Construir where clause otimizada
   */
  private buildWhereClause(userId: string, filters: FilterFinancialTransactionDto) {
    const where: any = { userId };

    if (filters.type) {
      where.type = filters.type;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.categoryId) {
      where.categoryId = filters.categoryId;
    }

    if (filters.paymentMethodId) {
      where.paymentMethodId = filters.paymentMethodId;
    }

    if (filters.startDate || filters.endDate) {
      where.transactionDate = {};
      if (filters.startDate) {
        where.transactionDate.gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        where.transactionDate.lte = new Date(filters.endDate);
      }
    }

    // Adicionar busca por texto se fornecido
    if (filters.search) {
      where.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    return where;
  }

  /**
   * Obter total count otimizado com cache
   */
  private async getTotalCount(userId: string, filters: FilterFinancialTransactionDto): Promise<number> {
    try {
      const cacheKey = `count:${userId}:${JSON.stringify(filters)}`;
      const cached = await this.cacheService.get<number>(cacheKey);
      
      if (cached !== null) {
        return cached;
      }

      const where = this.buildWhereClause(userId, filters);
      const count = await this.prisma.financialTransaction.count({ where });

      // Salvar count no cache por mais tempo
      await this.cacheService.set(cacheKey, count, 10 * 60); // 10 minutos

      return count;
    } catch (error) {
      this.logger.error('Erro ao contar transações:', error);
      return 0;
    }
  }

  /**
   * Obter filtro de data baseado no período
   */
  private getDateFilter(period: string) {
    const now = new Date();
    const startOfPeriod = new Date();

    switch (period) {
      case 'week':
        startOfPeriod.setDate(now.getDate() - 7);
        break;
      case 'month':
        startOfPeriod.setMonth(now.getMonth() - 1);
        break;
      case 'quarter':
        startOfPeriod.setMonth(now.getMonth() - 3);
        break;
      case 'year':
        startOfPeriod.setFullYear(now.getFullYear() - 1);
        break;
      default:
        startOfPeriod.setMonth(now.getMonth() - 1);
    }

    return {
      transactionDate: {
        gte: startOfPeriod,
        lte: now,
      },
    };
  }

  /**
   * Invalidar cache do usuário
   */
  private async invalidateUserCache(userId: string) {
    try {
      await Promise.all([
        this.cacheService.invalidate(`transactions:${userId}:*`),
        this.cacheService.invalidate(`summary:${userId}:*`),
        this.cacheService.invalidate(`count:${userId}:*`),
        this.cacheService.invalidate(`transactions:category:${userId}:*`),
      ]);
    } catch (error) {
      this.logger.error('Erro ao invalidar cache do usuário:', error);
    }
  }
} 