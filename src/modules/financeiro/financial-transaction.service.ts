import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service';
import { CreateFinancialTransactionDto } from './dto/create-financial-transaction.dto';
import { UpdateFinancialTransactionDto } from './dto/update-financial-transaction.dto';
import { FilterFinancialTransactionDto } from './dto/filter-financial-transaction.dto';
import { MakeRecurringDto } from './dto/make-recurring.dto';
import { FinancialTransactionStatus, Prisma, RecurrenceFrequency } from '@prisma/client';
import { TagsService } from '../tags/tags.service';

@Injectable()
export class FinancialTransactionService {
  constructor(
    private prisma: PrismaService,
    private tagsService: TagsService,
  ) {}

  async create(createFinancialTransactionDto: CreateFinancialTransactionDto, userId: string) {
    const { 
      title, 
      description, 
      amount, 
      dueDate, 
      paidDate, 
      type, 
      status, 
      categoryId, 
      paymentMethodId,
      tagIds
    } = createFinancialTransactionDto;

    // Verificar se a categoria existe
    await this.prisma.financialCategory.findUniqueOrThrow({
      where: { id: categoryId },
    });

    // Verificar se o método de pagamento existe (se fornecido)
    if (paymentMethodId) {
      await this.prisma.paymentMethod.findUniqueOrThrow({
        where: { id: paymentMethodId },
      });
    }

    // Validar tags se fornecidas
    if (tagIds && tagIds.length > 0) {
      const validTags = await this.tagsService.findByIds(tagIds);
      if (validTags.length !== tagIds.length) {
        throw new BadRequestException('Uma ou mais tags são inválidas ou estão inativas');
      }
    }

    // Validar datas
    const dueDateObj = new Date(dueDate);
    const paidDateObj = paidDate ? new Date(paidDate) : null;

    if (paidDateObj && paidDateObj < dueDateObj && status === FinancialTransactionStatus.PAID) {
      // Permitir pagamento antecipado
    }

    // Criar transação
    const transaction = await this.prisma.financialTransaction.create({
      data: {
        title,
        description,
        amount,
        dueDate: dueDateObj,
        paidDate: paidDateObj,
        type,
        status: status || FinancialTransactionStatus.PENDING,
        categoryId,
        paymentMethodId,
        userId,
      },
    });

    // Adicionar tags se fornecidas
    if (tagIds && tagIds.length > 0) {
      await this.prisma.financialTransactionTag.createMany({
        data: tagIds.map(tagId => ({
          financialTransactionId: transaction.id,
          tagId,
        })),
      });
    }

    // Retornar transação com todos os relacionamentos
    return this.prisma.financialTransaction.findUnique({
      where: { id: transaction.id },
      include: {
        category: true,
        paymentMethod: true,
        user: {
          select: { id: true, name: true, email: true },
        },
        tags: {
          include: {
            tag: true,
          },
        },
      },
    });
  }

  async findAll(filterDto: FilterFinancialTransactionDto, userId: string, userIsAdmin: boolean = false) {
    const { 
      startDate, 
      endDate, 
      type, 
      status, 
      categoryId, 
      paymentMethodId, 
      search,
      page = 1,
      limit = 50
    } = filterDto;

    const where: any = {};

    // Se o usuário não é admin, filtrar apenas suas transações
    if (!userIsAdmin) {
      where.userId = userId;
    }

    // Filtro por período
    if (startDate || endDate) {
      where.dueDate = {};
      if (startDate) where.dueDate.gte = new Date(startDate);
      if (endDate) where.dueDate.lte = new Date(endDate);
    }

    // Outros filtros
    if (type) where.type = type;
    if (status) where.status = status;
    if (categoryId) where.categoryId = categoryId;
    if (paymentMethodId) where.paymentMethodId = paymentMethodId;

    // Busca por texto
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Calcular offset para paginação
    const offset = (page - 1) * limit;

    // Usar método otimizado do PrismaService
    const transactions = await this.prisma.findManyOptimized(
      this.prisma.financialTransaction,
      {
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
          isRecurring: true,
          recurrenceFrequency: true,
          recurrenceInterval: true,
          recurrenceEndDate: true,
          originalTransactionId: true,
          createdAt: true,
          updatedAt: true,
          category: {
            select: {
              id: true,
              name: true,
              color: true,
              icon: true,
            },
          },
          paymentMethod: {
            select: {
              id: true,
              name: true,
              type: true,
            },
          },
          user: {
            select: { 
              id: true, 
              name: true, 
              email: true 
            },
          },
        },
        orderBy: { dueDate: 'desc' },
        skip: offset,
        take: limit,
      },
      { useRetry: true, maxRetries: 2 }
    );

    // Converter datas para ISO strings usando uma abordagem mais robusta
    return transactions.map(transaction => {
      const transformed: any = { ...transaction };
      
      // Função auxiliar para converter datas
      const convertDate = (date: any): string | null => {
        if (!date) return null;
        if (typeof date === 'string') return date;
        if (date instanceof Date) return date.toISOString();
        if (typeof date === 'object' && date.getTime) return new Date(date.getTime()).toISOString();
        return null;
      };

      // Converter campos de data
      transformed.dueDate = convertDate(transaction.dueDate);
      transformed.paidDate = convertDate(transaction.paidDate);
      transformed.createdAt = convertDate(transaction.createdAt);
      transformed.updatedAt = convertDate(transaction.updatedAt);
      transformed.recurrenceEndDate = convertDate(transaction.recurrenceEndDate);

      // Converter datas dos relacionamentos
      if (transaction.category) {
        transformed.category = {
          ...transaction.category,
          createdAt: convertDate(transaction.category.createdAt),
          updatedAt: convertDate(transaction.category.updatedAt),
        };
      }

      if (transaction.paymentMethod) {
        transformed.paymentMethod = {
          ...transaction.paymentMethod,
          createdAt: convertDate(transaction.paymentMethod.createdAt),
          updatedAt: convertDate(transaction.paymentMethod.updatedAt),
        };
      }

      return transformed;
    });
  }

  async findOne(id: string, userId: string, userIsAdmin: boolean = false) {
    const where: any = { id };
    
    // Se o usuário não é admin, verificar se a transação pertence a ele
    if (!userIsAdmin) {
      where.userId = userId;
    }

    const transaction = await this.prisma.financialTransaction.findFirst({
      where,
      include: {
        category: true,
        paymentMethod: true,
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!transaction) {
      throw new NotFoundException('Transação não encontrada');
    }

    // Função auxiliar para converter datas
    const convertDate = (date: any): string | null => {
      if (!date) return null;
      if (typeof date === 'string') return date;
      if (date instanceof Date) return date.toISOString();
      if (typeof date === 'object' && date.getTime) return new Date(date.getTime()).toISOString();
      return null;
    };

    // Converter datas para ISO strings
    const transformed: any = { ...transaction };
    
    // Converter campos de data
    transformed.dueDate = convertDate(transaction.dueDate);
    transformed.paidDate = convertDate(transaction.paidDate);
    transformed.createdAt = convertDate(transaction.createdAt);
    transformed.updatedAt = convertDate(transaction.updatedAt);
    transformed.recurrenceEndDate = convertDate(transaction.recurrenceEndDate);

    // Converter datas dos relacionamentos
    if (transaction.category) {
      transformed.category = {
        ...transaction.category,
        createdAt: convertDate(transaction.category.createdAt),
        updatedAt: convertDate(transaction.category.updatedAt),
      };
    }

    if (transaction.paymentMethod) {
      transformed.paymentMethod = {
        ...transaction.paymentMethod,
        createdAt: convertDate(transaction.paymentMethod.createdAt),
        updatedAt: convertDate(transaction.paymentMethod.updatedAt),
      };
    }

    return transformed;
  }

  async update(id: string, updateFinancialTransactionDto: UpdateFinancialTransactionDto, userId: string, userIsAdmin: boolean = false) {
    // Verificar se a transação existe e se o usuário tem permissão para editá-la
    await this.findOne(id, userId, userIsAdmin);

    const { categoryId, paymentMethodId, dueDate, paidDate } = updateFinancialTransactionDto;

    // Verificar se a categoria existe (se fornecida)
    if (categoryId) {
      await this.prisma.financialCategory.findUniqueOrThrow({
        where: { id: categoryId },
      });
    }

    // Verificar se o método de pagamento existe (se fornecido)
    if (paymentMethodId) {
      await this.prisma.paymentMethod.findUniqueOrThrow({
        where: { id: paymentMethodId },
      });
    }

    // Filtrar apenas campos que foram fornecidos para evitar problemas com undefined
    const dataToUpdate: any = {};
    
    // Apenas adicionar campos que não são undefined
    Object.keys(updateFinancialTransactionDto).forEach(key => {
      const value = updateFinancialTransactionDto[key];
      if (value !== undefined) {
        dataToUpdate[key] = value;
      }
    });

    // Converter datas se fornecidas
    if (dueDate) dataToUpdate.dueDate = new Date(dueDate);
    if (paidDate) dataToUpdate.paidDate = new Date(paidDate);

    // Verificar se há dados para atualizar
    if (Object.keys(dataToUpdate).length === 0) {
      throw new BadRequestException('Nenhum campo fornecido para atualização');
    }

    return this.prisma.financialTransaction.update({
      where: { id },
      data: dataToUpdate,
      include: {
        category: true,
        paymentMethod: true,
      },
    });
  }

  async remove(id: string, userId: string, deleteAllRecurring: boolean = false, userIsAdmin: boolean = false) {
    const transaction = await this.findOne(id, userId, userIsAdmin);

    // Se a transação foi criada por recorrência, perguntar se quer deletar todas
    if (transaction.originalTransactionId && !deleteAllRecurring) {
      // Buscar todas as transações relacionadas
      const relatedTransactions = await this.prisma.financialTransaction.findMany({
        where: {
          OR: [
            { id: transaction.originalTransactionId },
            { originalTransactionId: transaction.originalTransactionId },
          ],
        },
      });

      return {
        message: 'Esta transação foi criada por recorrência. Deseja deletar apenas esta transação ou todas as transações relacionadas?',
        transaction,
        relatedTransactions,
        requiresConfirmation: true,
      };
    }

    // Se é uma transação original e tem transações recorrentes
    if (transaction.isRecurring && !deleteAllRecurring) {
      const recurringTransactions = await this.prisma.financialTransaction.findMany({
        where: { originalTransactionId: id },
      });

      if (recurringTransactions.length > 0) {
        return {
          message: 'Esta transação é recorrente. Deseja deletar apenas esta transação ou todas as transações recorrentes?',
          transaction,
          recurringTransactions,
          requiresConfirmation: true,
        };
      }
    }

    // Deletar transações relacionadas se solicitado
    if (deleteAllRecurring) {
      if (transaction.originalTransactionId) {
        // Deletar todas as transações relacionadas
        await this.prisma.financialTransaction.deleteMany({
          where: {
            OR: [
              { id: transaction.originalTransactionId },
              { originalTransactionId: transaction.originalTransactionId },
            ],
          },
        });
      } else if (transaction.isRecurring) {
        // Deletar todas as transações recorrentes
        await this.prisma.financialTransaction.deleteMany({
          where: {
            OR: [
              { id },
              { originalTransactionId: id },
            ],
          },
        });
      }
    } else {
      // Deletar apenas a transação específica
      await this.prisma.financialTransaction.delete({
        where: { id },
      });
    }

    return {
      message: 'Transação deletada com sucesso',
      deletedTransaction: transaction,
    };
  }

  async markAsPaid(id: string, userId: string, paidDate?: string, userIsAdmin: boolean = false) {
    const transaction = await this.findOne(id, userId, userIsAdmin);

    if (transaction.status === FinancialTransactionStatus.PAID) {
      throw new BadRequestException('Transação já está marcada como paga');
    }

    return this.prisma.financialTransaction.update({
      where: { id },
      data: {
        status: FinancialTransactionStatus.PAID,
        paidDate: paidDate ? new Date(paidDate) : new Date(),
      },
      include: {
        category: true,
        paymentMethod: true,
      },
    });
  }

  async markAsOverdue(userId: string, userIsAdmin: boolean = false) {
    const today = new Date();
    today.setHours(23, 59, 59, 999); // Final do dia

    const where: any = {
      status: FinancialTransactionStatus.PENDING,
      dueDate: { lt: today },
    };

    // Se o usuário não é admin, filtrar apenas suas transações
    if (!userIsAdmin) {
      where.userId = userId;
    }

    return this.prisma.financialTransaction.updateMany({
      where,
      data: {
        status: FinancialTransactionStatus.OVERDUE,
      },
    });
  }

  async getDashboardSummary(userId: string, startDate?: string, endDate?: string, userIsAdmin: boolean = false) {
    const where: any = {};

    // Se o usuário não é admin, filtrar apenas suas transações
    if (!userIsAdmin) {
      where.userId = userId;
    }

    // Filtro por período
    if (startDate || endDate) {
      where.dueDate = {};
      if (startDate) where.dueDate.gte = new Date(startDate);
      if (endDate) where.dueDate.lte = new Date(endDate);
    }

    const [
      totalReceivables,
      totalPayables,
      paidReceivables,
      paidPayables,
      overdueReceivables,
      overduePayables,
      transactionsByCategory,
      transactionsByMonth
    ] = await Promise.all([
      // Total a receber
      this.prisma.financialTransaction.aggregate({
        where: { ...where, type: 'RECEIVABLE' },
        _sum: { amount: true },
        _count: true,
      }),
      // Total a pagar
      this.prisma.financialTransaction.aggregate({
        where: { ...where, type: 'PAYABLE' },
        _sum: { amount: true },
        _count: true,
      }),
      // Recebido
      this.prisma.financialTransaction.aggregate({
        where: { ...where, type: 'RECEIVABLE', status: 'PAID' },
        _sum: { amount: true },
        _count: true,
      }),
      // Pago
      this.prisma.financialTransaction.aggregate({
        where: { ...where, type: 'PAYABLE', status: 'PAID' },
        _sum: { amount: true },
        _count: true,
      }),
      // Vencido a receber
      this.prisma.financialTransaction.aggregate({
        where: { ...where, type: 'RECEIVABLE', status: 'OVERDUE' },
        _sum: { amount: true },
        _count: true,
      }),
      // Vencido a pagar
      this.prisma.financialTransaction.aggregate({
        where: { ...where, type: 'PAYABLE', status: 'OVERDUE' },
        _sum: { amount: true },
        _count: true,
      }),
      // Por categoria
      this.prisma.financialTransaction.groupBy({
        by: ['categoryId'],
        where,
        _sum: { amount: true },
        _count: true,
      }),
      // Por mês
      this.prisma.$queryRaw`
        SELECT 
          DATE_TRUNC('month', "dueDate") as month,
          type,
          SUM(amount) as total,
          COUNT(*) as count
        FROM "financial_transactions"
        WHERE ${userIsAdmin ? Prisma.sql`1=1` : Prisma.sql`"userId" = ${userId}`}
        ${startDate ? Prisma.sql`AND "dueDate" >= ${new Date(startDate)}` : Prisma.sql``}
        ${endDate ? Prisma.sql`AND "dueDate" <= ${new Date(endDate)}` : Prisma.sql``}
        GROUP BY DATE_TRUNC('month', "dueDate"), type
        ORDER BY month DESC
      `
    ]);

    return {
      summary: {
        receivables: {
          total: totalReceivables._sum.amount || 0,
          count: totalReceivables._count,
          paid: paidReceivables._sum.amount || 0,
          paidCount: paidReceivables._count,
          overdue: overdueReceivables._sum.amount || 0,
          overdueCount: overdueReceivables._count,
        },
        payables: {
          total: totalPayables._sum.amount || 0,
          count: totalPayables._count,
          paid: paidPayables._sum.amount || 0,
          paidCount: paidPayables._count,
          overdue: overduePayables._sum.amount || 0,
          overdueCount: overduePayables._count,
        },
        balance: {
          total: (Number(totalReceivables._sum.amount) || 0) - (Number(totalPayables._sum.amount) || 0),
          realized: (Number(paidReceivables._sum.amount) || 0) - (Number(paidPayables._sum.amount) || 0),
        },
      },
      charts: {
        byCategory: transactionsByCategory,
        byMonth: transactionsByMonth,
      },
    };
  }

  async makeRecurring(transactionId: string, makeRecurringDto: MakeRecurringDto, userId: string, userIsAdmin: boolean = false) {
    // Buscar a transação original
    const originalTransaction = await this.findOne(transactionId, userId, userIsAdmin);

    if (originalTransaction.isRecurring) {
      throw new BadRequestException('Esta transação já é recorrente');
    }

    if (originalTransaction.originalTransactionId) {
      throw new BadRequestException('Esta transação foi criada por recorrência e não pode ser tornada recorrente novamente');
    }

    const { frequency, interval, endDate } = makeRecurringDto;

    // Calcular a data de fim da recorrência
    let calculatedEndDate: Date | null = null;
    
    if (frequency === RecurrenceFrequency.UNTIL_END_OF_YEAR) {
      const currentYear = new Date().getFullYear();
      calculatedEndDate = new Date(currentYear, 11, 31); // 31 de dezembro do ano atual
    } else if (endDate) {
      calculatedEndDate = new Date(endDate);
    } else {
      // Calcular baseado no número de parcelas
      if (originalTransaction.dueDate) {
        calculatedEndDate = this.calculateEndDate(new Date(originalTransaction.dueDate), frequency, interval);
      }
    }

    // Preparar dados para criação em lote
    const transactionsToCreate: Prisma.FinancialTransactionCreateManyInput[] = [];
    const startDate = originalTransaction.dueDate ? new Date(originalTransaction.dueDate) : new Date();

    for (let i = 1; i < interval; i++) {
      const nextDueDate = this.calculateNextDueDate(startDate, frequency, i);
      
      if (calculatedEndDate && nextDueDate > calculatedEndDate) {
        break;
      }

      transactionsToCreate.push({
        title: originalTransaction.title,
        description: originalTransaction.description,
        amount: originalTransaction.amount,
        dueDate: nextDueDate,
        type: originalTransaction.type,
        status: FinancialTransactionStatus.PENDING,
        categoryId: originalTransaction.categoryId,
        paymentMethodId: originalTransaction.paymentMethodId,
        userId: originalTransaction.userId,
        isRecurring: true,
        originalTransactionId: transactionId,
        recurrenceFrequency: frequency,
        recurrenceInterval: interval,
        recurrenceEndDate: calculatedEndDate,
      });
    }

    // Criar todas as transações recorrentes em lotes otimizados
    let createdTransactions: any[] = [];
    if (transactionsToCreate.length > 0) {
      // Usar processamento em lotes para melhor performance
      await this.createTransactionsInBatches(transactionsToCreate);

      // Buscar as transações criadas com relacionamentos (apenas se necessário)
      createdTransactions = await this.prisma.financialTransaction.findMany({
        where: {
          originalTransactionId: transactionId,
          isRecurring: true,
        },
        include: {
          category: true,
          paymentMethod: true,
        },
        orderBy: {
          dueDate: 'asc',
        },
      });
    }

    // Atualizar a transação original para marcar como recorrente
    await this.prisma.financialTransaction.update({
      where: { id: transactionId },
      data: {
        isRecurring: true,
        recurrenceFrequency: frequency,
        recurrenceInterval: interval,
        recurrenceEndDate: calculatedEndDate,
      },
    });

    return {
      message: `Transação tornada recorrente com ${createdTransactions.length} parcelas criadas`,
      originalTransaction: await this.findOne(transactionId, userId, userIsAdmin),
      recurringTransactions: createdTransactions,
    };
  }

  private async createTransactionsInBatches(transactions: Prisma.FinancialTransactionCreateManyInput[], batchSize: number = 50) {
    // Processar em lotes para evitar sobrecarga da memória e melhorar performance
    for (let i = 0; i < transactions.length; i += batchSize) {
      const batch = transactions.slice(i, i + batchSize);
      
      await this.prisma.financialTransaction.createMany({
        data: batch,
      });
    }
  }

  private calculateNextDueDate(startDate: Date, frequency: RecurrenceFrequency, interval: number): Date {
    const nextDate = new Date(startDate);
    
    switch (frequency) {
      case RecurrenceFrequency.DAILY:
        nextDate.setDate(nextDate.getDate() + interval);
        break;
      case RecurrenceFrequency.WEEKLY:
        nextDate.setDate(nextDate.getDate() + (interval * 7));
        break;
      case RecurrenceFrequency.FORTNIGHTLY:
        nextDate.setDate(nextDate.getDate() + (interval * 14));
        break;
      case RecurrenceFrequency.MONTHLY:
        nextDate.setMonth(nextDate.getMonth() + interval);
        break;
      case RecurrenceFrequency.BIMONTHLY:
        nextDate.setMonth(nextDate.getMonth() + (interval * 2));
        break;
      case RecurrenceFrequency.QUARTERLY:
        nextDate.setMonth(nextDate.getMonth() + (interval * 3));
        break;
      case RecurrenceFrequency.SEMIANNUAL:
        nextDate.setMonth(nextDate.getMonth() + (interval * 6));
        break;
      case RecurrenceFrequency.ANNUAL:
        nextDate.setFullYear(nextDate.getFullYear() + interval);
        break;
      default:
        throw new BadRequestException('Frequência inválida');
    }
    
    return nextDate;
  }

  private calculateEndDate(startDate: Date, frequency: RecurrenceFrequency, interval: number): Date {
    return this.calculateNextDueDate(startDate, frequency, interval - 1);
  }
} 