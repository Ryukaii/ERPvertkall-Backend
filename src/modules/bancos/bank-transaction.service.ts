import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service';
import { CreateBankTransactionDto } from './dto/create-bank-transaction.dto';
import { UpdateBankTransactionDto } from './dto/update-bank-transaction.dto';
import { FilterBankTransactionDto } from './dto/filter-bank-transaction.dto';
import { FinancialTransaction, FinancialTransactionType, FinancialTransactionStatus } from '@prisma/client';

@Injectable()
export class BankTransactionService {
  constructor(private prisma: PrismaService) {}

  async create(createTransactionDto: CreateBankTransactionDto, bankId: string, userId: string): Promise<FinancialTransaction> {
    // Verificar se o banco existe
    const bank = await this.prisma.bank.findUnique({
      where: { id: bankId },
    });

    if (!bank) {
      throw new NotFoundException('Banco não encontrado');
    }

    return this.prisma.financialTransaction.create({
      data: {
        ...createTransactionDto,
        transactionDate: new Date(createTransactionDto.transactionDate),
        bankId,
        userId, // Adicionando userId obrigatório
        // Para transações bancárias, não usamos dueDate
        dueDate: null,
      },
      include: {
        bank: true,
        category: true,
        paymentMethod: true,
      },
    });
  }

  async findAll(bankId: string, filters?: FilterBankTransactionDto): Promise<FinancialTransaction[]> {
    const where: any = {
      bankId,
      type: {
        in: ['CREDIT', 'DEBIT']
      }
    };

    if (filters) {
      if (filters.type) where.type = filters.type;
      if (filters.status) where.status = filters.status;
      if (filters.categoryId) where.categoryId = filters.categoryId;
      if (filters.paymentMethodId) where.paymentMethodId = filters.paymentMethodId;
      
      if (filters.startDate || filters.endDate) {
        where.transactionDate = {};
        if (filters.startDate) where.transactionDate.gte = new Date(filters.startDate);
        if (filters.endDate) where.transactionDate.lte = new Date(filters.endDate);
      }
    }

    return this.prisma.financialTransaction.findMany({
      where,
      include: {
        bank: true,
        category: true,
        paymentMethod: true,
      },
      orderBy: {
        transactionDate: 'desc',
      },
    });
  }

  async findOne(id: string, bankId: string): Promise<FinancialTransaction> {
    const transaction = await this.prisma.financialTransaction.findFirst({
      where: {
        id,
        bankId,
        type: {
          in: ['CREDIT', 'DEBIT']
        }
      },
      include: {
        bank: true,
        category: true,
        paymentMethod: true,
      },
    });

    if (!transaction) {
      throw new NotFoundException('Transação não encontrada');
    }

    return transaction;
  }

  async update(id: string, updateTransactionDto: UpdateBankTransactionDto, bankId: string): Promise<FinancialTransaction> {
    // Verificar se a transação existe e pertence ao banco
    await this.findOne(id, bankId);

    // Filtrar apenas campos que foram fornecidos para evitar problemas com undefined
    const updateData: any = {};
    
    // Apenas adicionar campos que não são undefined
    Object.keys(updateTransactionDto).forEach(key => {
      const value = updateTransactionDto[key];
      if (value !== undefined) {
        updateData[key] = value;
      }
    });

    // Converter data se fornecida
    if (updateTransactionDto.transactionDate) {
      updateData.transactionDate = new Date(updateTransactionDto.transactionDate);
    }

    // Verificar se há dados para atualizar
    if (Object.keys(updateData).length === 0) {
      throw new BadRequestException('Nenhum campo fornecido para atualização');
    }

    return this.prisma.financialTransaction.update({
      where: { id },
      data: updateData,
      include: {
        bank: true,
        category: true,
        paymentMethod: true,
      },
    });
  }

  async remove(id: string, bankId: string): Promise<void> {
    // Verificar se a transação existe e pertence ao banco
    await this.findOne(id, bankId);

    await this.prisma.financialTransaction.delete({
      where: { id },
    });
  }

  async updateStatus(id: string, status: FinancialTransactionStatus, bankId: string): Promise<FinancialTransaction> {
    // Verificar se a transação existe e pertence ao banco
    await this.findOne(id, bankId);

    return this.prisma.financialTransaction.update({
      where: { id },
      data: { status },
      include: {
        bank: true,
        category: true,
        paymentMethod: true,
      },
    });
  }

  async getTransactionSummary(bankId: string, startDate?: string, endDate?: string): Promise<{
    totalCredits: number;
    totalDebits: number;
    netAmount: number;
    transactionCount: number;
  }> {
    const where: any = {
      bankId,
      status: 'CONFIRMED',
      type: {
        in: ['CREDIT', 'DEBIT']
      }
    };

    if (startDate || endDate) {
      where.transactionDate = {};
      if (startDate) where.transactionDate.gte = new Date(startDate);
      if (endDate) where.transactionDate.lte = new Date(endDate);
    }

    const transactions = await this.prisma.financialTransaction.findMany({
      where,
      select: {
        amount: true,
        type: true,
      },
    });

    const totalCredits = transactions
      .filter(t => t.type === 'CREDIT')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalDebits = transactions
      .filter(t => t.type === 'DEBIT')
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    return {
      totalCredits,
      totalDebits,
      netAmount: totalCredits - totalDebits,
      transactionCount: transactions.length,
    };
  }

  async findAllTransactions(filters?: FilterBankTransactionDto, userId?: string): Promise<FinancialTransaction[]> {
    const where: any = {
      type: {
        in: ['CREDIT', 'DEBIT']
      }
    };

    // Filtrar por usuário se fornecido
    if (userId) {
      where.userId = userId;
    }

    if (filters) {
      if (filters.type) where.type = filters.type;
      if (filters.status) where.status = filters.status;
      if (filters.categoryId) where.categoryId = filters.categoryId;
      if (filters.paymentMethodId) where.paymentMethodId = filters.paymentMethodId;
      
      if (filters.startDate || filters.endDate) {
        where.transactionDate = {};
        if (filters.startDate) where.transactionDate.gte = new Date(filters.startDate);
        if (filters.endDate) where.transactionDate.lte = new Date(filters.endDate);
      }
    }

    return this.prisma.financialTransaction.findMany({
      where,
      include: {
        bank: true,
        category: true,
        paymentMethod: true,
      },
      orderBy: {
        transactionDate: 'desc',
      },
    });
  }
} 