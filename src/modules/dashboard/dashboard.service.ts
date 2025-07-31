import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service';
import { DashboardFiltersDto, DashboardSummaryResponse } from './dto/dashboard-summary.dto';
import { FinancialTransactionType, FinancialTransactionStatus } from '@prisma/client';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getDashboardSummary(filters: DashboardFiltersDto, userId: string): Promise<DashboardSummaryResponse> {
    const { bankId, startDate, endDate } = filters;
    
    // Construir where base para filtros
    const whereBase: any = {
      userId,
    };

    if (bankId) {
      whereBase.bankId = bankId;
    }

    // Filtro de período - usar os últimos 12 meses se não especificado
    const now = new Date();
    const defaultStartDate = new Date(now.getFullYear() - 1, now.getMonth(), 1);
    const defaultEndDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    const periodStart = startDate ? new Date(startDate) : defaultStartDate;
    const periodEnd = endDate ? new Date(endDate) : defaultEndDate;

    // Calcular métricas principais (sequential to avoid pool exhaustion)
    const totalReceivable = await this.calculateTotalReceivable(whereBase, periodStart, periodEnd);
    const totalPayable = await this.calculateTotalPayable(whereBase, periodStart, periodEnd);
    const totalPending = await this.calculateTotalPending(whereBase, periodStart, periodEnd);
    const totalOverdue = await this.calculateTotalOverdue(whereBase);

    // Obter dados mensais para gráficos
    const monthlyData = await this.getMonthlyData(whereBase, periodStart, periodEnd);

    // Obter transações de hoje
    const todayTransactions = await this.getTodayTransactions(whereBase);

    // Obter transações vencidas
    const overdueTransactions = await this.getOverdueTransactions(whereBase);

    return {
      totalReceivable,
      totalPayable,
      totalPending,
      totalOverdue,
      monthlyData,
      todayTransactions,
      overdueTransactions,
    };
  }

  private async calculateTotalReceivable(whereBase: any, startDate: Date, endDate: Date): Promise<number> {
    const result = await this.prisma.financialTransaction.aggregate({
      where: {
        ...whereBase,
        type: {
          in: [FinancialTransactionType.RECEIVABLE, FinancialTransactionType.CREDIT],
        },
        OR: [
          { dueDate: { gte: startDate, lte: endDate } },
          { transactionDate: { gte: startDate, lte: endDate } },
        ],
      },
      _sum: {
        amount: true,
      },
    });

    return result._sum.amount || 0;
  }

  private async calculateTotalPayable(whereBase: any, startDate: Date, endDate: Date): Promise<number> {
    const result = await this.prisma.financialTransaction.aggregate({
      where: {
        ...whereBase,
        type: {
          in: [FinancialTransactionType.PAYABLE, FinancialTransactionType.DEBIT],
        },
        OR: [
          { dueDate: { gte: startDate, lte: endDate } },
          { transactionDate: { gte: startDate, lte: endDate } },
        ],
      },
      _sum: {
        amount: true,
      },
    });

    return result._sum.amount || 0;
  }

  private async calculateTotalPending(whereBase: any, startDate: Date, endDate: Date): Promise<number> {
    const result = await this.prisma.financialTransaction.aggregate({
      where: {
        ...whereBase,
        status: FinancialTransactionStatus.PENDING,
        OR: [
          { dueDate: { gte: startDate, lte: endDate } },
          { transactionDate: { gte: startDate, lte: endDate } },
        ],
      },
      _sum: {
        amount: true,
      },
    });

    return result._sum.amount || 0;
  }

  private async calculateTotalOverdue(whereBase: any): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const result = await this.prisma.financialTransaction.aggregate({
      where: {
        ...whereBase,
        status: {
          in: [FinancialTransactionStatus.PENDING, FinancialTransactionStatus.OVERDUE],
        },
        dueDate: {
          lt: today,
        },
      },
      _sum: {
        amount: true,
      },
    });

    return result._sum.amount || 0;
  }

  private async getMonthlyData(whereBase: any, startDate: Date, endDate: Date) {
    // Buscar todas as transações no período
    const transactions = await this.prisma.financialTransaction.findMany({
      where: {
        ...whereBase,
        OR: [
          { dueDate: { gte: startDate, lte: endDate } },
          { transactionDate: { gte: startDate, lte: endDate } },
        ],
      },
      select: {
        amount: true,
        type: true,
        status: true,
        dueDate: true,
        transactionDate: true,
        paidDate: true,
      },
    });

    // Agrupar por mês
    const monthlyMap = new Map();

    transactions.forEach((transaction) => {
      const date = transaction.transactionDate || transaction.dueDate;
      if (!date) return;

      const monthKey = date.toISOString().substring(0, 7); // YYYY-MM

      if (!monthlyMap.has(monthKey)) {
        monthlyMap.set(monthKey, {
          month: monthKey,
          receivable: 0,
          payable: 0,
          previstoRecebido: 0,
          previstoPago: 0,
          recebidoConfirmado: 0,
          pagoConfirmado: 0,
        });
      }

      const monthData = monthlyMap.get(monthKey);
      const amount = transaction.amount;

      // Categorizar baseado no tipo
      const receivableTypes = [FinancialTransactionType.RECEIVABLE, FinancialTransactionType.CREDIT];
      const payableTypes = [FinancialTransactionType.PAYABLE, FinancialTransactionType.DEBIT];
      const isReceivable = receivableTypes.includes(transaction.type as any);
      const isPayable = payableTypes.includes(transaction.type as any);

      if (isReceivable) {
        monthData.receivable += amount;
        if (transaction.status === FinancialTransactionStatus.PENDING) {
          monthData.previstoRecebido += amount;
        } else if (transaction.status === FinancialTransactionStatus.PAID || transaction.status === FinancialTransactionStatus.CONFIRMED) {
          monthData.recebidoConfirmado += amount;
        }
      }

      if (isPayable) {
        monthData.payable += amount;
        if (transaction.status === FinancialTransactionStatus.PENDING) {
          monthData.previstoPago += amount;
        } else if (transaction.status === FinancialTransactionStatus.PAID || transaction.status === FinancialTransactionStatus.CONFIRMED) {
          monthData.pagoConfirmado += amount;
        }
      }
    });

    return Array.from(monthlyMap.values()).sort((a, b) => a.month.localeCompare(b.month));
  }

  private async getTodayTransactions(whereBase: any) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const transactions = await this.prisma.financialTransaction.findMany({
      where: {
        ...whereBase,
        OR: [
          { dueDate: { gte: today, lt: tomorrow } },
          { transactionDate: { gte: today, lt: tomorrow } },
        ],
      },
      include: {
        category: {
          select: { id: true, name: true },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 10,
    });

    return transactions.map((transaction) => ({
      id: transaction.id,
      title: transaction.title,
      amount: transaction.amount,
      type: ([FinancialTransactionType.RECEIVABLE, FinancialTransactionType.CREDIT] as any[]).includes(transaction.type) 
        ? 'CREDIT' as const 
        : 'DEBIT' as const,
      transactionDate: (transaction.transactionDate || transaction.dueDate)?.toISOString() || '',
      category: transaction.category ? {
        id: transaction.category.id,
        name: transaction.category.name,
      } : undefined,
    }));
  }

  private async getOverdueTransactions(whereBase: any) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const transactions = await this.prisma.financialTransaction.findMany({
      where: {
        ...whereBase,
        status: {
          in: [FinancialTransactionStatus.PENDING, FinancialTransactionStatus.OVERDUE],
        },
        dueDate: {
          lt: today,
        },
      },
      include: {
        category: {
          select: { id: true, name: true },
        },
      },
      orderBy: {
        dueDate: 'asc',
      },
      take: 10,
    });

    return transactions.map((transaction) => ({
      id: transaction.id,
      title: transaction.title,
      amount: transaction.amount,
      transactionDate: transaction.dueDate?.toISOString() || '',
      category: transaction.category ? {
        id: transaction.category.id,
        name: transaction.category.name,
      } : undefined,
    }));
  }
}