import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service';
import { CreateBancoDto } from './dto/create-banco.dto';
import { UpdateBancoDto } from './dto/update-banco.dto';
import { TransactionFiltersDto, TransactionsSummaryResponse } from './dto/transactions-summary.dto';
import { BanksWithBalanceResponse } from './dto/banks-with-balance.dto';
import { Bank, BankAccountType, BankDocumentType, FinancialTransactionType, FinancialTransactionStatus } from '@prisma/client';

@Injectable()
export class BancosService {
  constructor(private prisma: PrismaService) {}

  async create(createBancoDto: CreateBancoDto): Promise<Bank> {
    return this.prisma.bank.create({
      data: {
        ...createBancoDto,
        balance: createBancoDto.balance || 0,
      },
    });
  }

  async findAll(): Promise<Bank[]> {
    return this.prisma.bank.findMany({
      where: {
        isActive: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: string): Promise<Bank> {
    const bank = await this.prisma.bank.findFirst({
      where: {
        id,
        isActive: true,
      },
    });

    if (!bank) {
      throw new NotFoundException('Banco não encontrado');
    }

    return bank;
  }

  async update(id: string, updateBancoDto: UpdateBancoDto): Promise<Bank> {
    // Verificar se o banco existe
    await this.findOne(id);

    return this.prisma.bank.update({
      where: { id },
      data: updateBancoDto,
    });
  }

  async remove(id: string): Promise<void> {
    // Verificar se o banco existe
    await this.findOne(id);

    // Soft delete - apenas marcar como inativo
    await this.prisma.bank.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async getBalance(id: string): Promise<{ balance: number }> {
    const bank = await this.findOne(id);
    
    // Calcular saldo baseado nas transações bancárias confirmadas
    const transactions = await this.prisma.financialTransaction.findMany({
      where: {
        bankId: id,
        status: 'CONFIRMED',
        type: {
          in: ['CREDIT', 'DEBIT']
        }
      },
    });

    const calculatedBalance = transactions.reduce((acc, transaction) => {
      return acc + transaction.amount;
    }, bank.balance);

    return { balance: calculatedBalance };
  }

  async getAccountTypes(): Promise<{ value: BankAccountType; label: string }[]> {
    return [
      { value: 'CHECKING', label: 'Conta Corrente' },
      { value: 'SAVINGS', label: 'Conta Poupança' },
      { value: 'INVESTMENT', label: 'Conta de Investimento' },
      { value: 'CREDIT', label: 'Cartão de Crédito' },
    ];
  }

  async getDocumentTypes(): Promise<{ value: BankDocumentType; label: string }[]> {
    return [
      { value: 'CPF', label: 'CPF (Pessoa Física)' },
      { value: 'CNPJ', label: 'CNPJ (Pessoa Jurídica)' },
    ];
  }

  async getTransactionsSummary(filters: TransactionFiltersDto, userId: string): Promise<TransactionsSummaryResponse> {
    const { 
      bankId, 
      type, 
      status, 
      categoryId, 
      startDate, 
      endDate, 
      search,
      page = 1,
      limit = 20
    } = filters;

    // Construir where base
    const where: any = {
      userId,
    };

    // Filtro por banco (se não for 'all')
    if (bankId && bankId !== 'all') {
      where.bankId = bankId;
    }

    // Outros filtros
    if (type) where.type = type;
    if (status) where.status = status;
    if (categoryId) where.categoryId = categoryId;

    // Filtro por período
    if (startDate || endDate) {
      where.OR = [
        {
          dueDate: {
            ...(startDate && { gte: new Date(startDate) }),
            ...(endDate && { lte: new Date(endDate) }),
          }
        },
        {
          transactionDate: {
            ...(startDate && { gte: new Date(startDate) }),
            ...(endDate && { lte: new Date(endDate) }),
          }
        }
      ];
    }

    // Busca por texto
    if (search) {
      where.AND = [
        ...(where.AND || []),
        {
          OR: [
            { title: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
          ]
        }
      ];
    }

    // Calcular offset para paginação
    const offset = (page - 1) * limit;

    // Buscar transações com paginação (sequential to avoid pool exhaustion)
    const transactions = await this.prisma.executeWithRetry(() =>
      this.prisma.financialTransaction.findMany({
        where,
        include: {
          category: {
            select: { id: true, name: true },
          },
          bank: {
            select: { 
              id: true, 
              name: true, 
              accountNumber: true, 
              accountType: true 
            },
          },
          transferFromBank: {
            select: { id: true, name: true },
          },
          transferToBank: {
            select: { id: true, name: true },
          },
        },
        orderBy: [
          { transactionDate: 'desc' },
          { dueDate: 'desc' },
          { createdAt: 'desc' },
        ],
        skip: offset,
        take: limit,
      })
    );
    
    const total = await this.prisma.executeWithRetry(() =>
      this.prisma.financialTransaction.count({ where })
    );

    // Calcular resumo das transações filtradas
    const summary = await this.calculateTransactionsSummary(where);

    // Mapear transações para o formato da resposta
    const transactionItems = transactions.map((transaction) => ({
      id: transaction.id,
      title: transaction.title,
      description: transaction.description || undefined,
      amount: transaction.amount,
      type: this.mapTransactionType(transaction.type),
      transactionDate: (transaction.transactionDate || transaction.dueDate)?.toISOString() || '',
      status: this.mapTransactionStatus(transaction.status),
      category: transaction.category ? {
        id: transaction.category.id,
        name: transaction.category.name,
      } : undefined,
      bank: transaction.bank ? {
        id: transaction.bank.id,
        name: transaction.bank.name,
        accountNumber: transaction.bank.accountNumber,
        accountType: transaction.bank.accountType,
      } : undefined,
      transferFromBank: transaction.transferFromBank ? {
        id: transaction.transferFromBank.id,
        name: transaction.transferFromBank.name,
      } : undefined,
      transferToBank: transaction.transferToBank ? {
        id: transaction.transferToBank.id,
        name: transaction.transferToBank.name,
      } : undefined,
    }));

    // Calcular paginação
    const totalPages = Math.ceil(total / limit);

    return {
      summary,
      transactions: transactionItems,
      pagination: {
        total,
        page,
        limit,
        totalPages,
      },
    };
  }

  async getBanksWithBalance(): Promise<BanksWithBalanceResponse> {
    const banks = await this.prisma.bank.findMany({
      where: {
        isActive: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    // Process banks sequentially to avoid pool exhaustion
    const banksWithBalance: Array<{
      id: string;
      name: string;
      accountNumber: string;
      accountType: any;
      holderName: string;
      document: string;
      isActive: boolean;
      initialBalance: number;
      realBalance: number;
      transactionBalance: number;
    }> = [];
    
    for (const bank of banks) {
      const transactionBalance = await this.prisma.executeWithRetry(() => 
        this.calculateTransactionBalance(bank.id)
      );
      const realBalance = bank.balance + transactionBalance;

      banksWithBalance.push({
        id: bank.id,
        name: bank.name,
        accountNumber: bank.accountNumber,
        accountType: bank.accountType,
        holderName: bank.holderName,
        document: bank.document,
        isActive: bank.isActive,
        initialBalance: bank.balance,
        realBalance,
        transactionBalance,
      });
    }

    return {
      banks: banksWithBalance,
    };
  }

  private async calculateTransactionsSummary(where: any) {
    // Buscar todas as transações que atendem aos filtros
    const transactions = await this.prisma.financialTransaction.findMany({
      where,
      select: {
        amount: true,
        type: true,
        transferFromBankId: true,
        transferToBankId: true,
      },
    });

    let totalCredits = 0;
    let totalDebits = 0;
    const totalTransactions = transactions.length;

    transactions.forEach((transaction) => {
      const amount = transaction.amount;
      
      // Categorizar como crédito ou débito baseado no tipo
      const creditTypes = [FinancialTransactionType.RECEIVABLE, FinancialTransactionType.CREDIT];
      const debitTypes = [FinancialTransactionType.PAYABLE, FinancialTransactionType.DEBIT];
      
      if (creditTypes.includes(transaction.type as any)) {
        totalCredits += amount;
      } else if (debitTypes.includes(transaction.type as any)) {
        totalDebits += amount;
      } else if (transaction.type === FinancialTransactionType.TRANSFER) {
        // Para transferências, considerar como débito se é saída, crédito se é entrada
        // Isso depende da perspectiva do banco selecionado
        totalCredits += amount; // Simplificado por enquanto
      }
    });

    const periodBalance = totalCredits - totalDebits;

    return {
      totalTransactions,
      totalCredits,
      totalDebits,
      periodBalance,
    };
  }

  private async calculateTransactionBalance(bankId: string): Promise<number> {
    // Calcular saldo baseado nas transações bancárias confirmadas
    const creditTransactions = await this.prisma.financialTransaction.aggregate({
      where: {
        bankId,
        status: FinancialTransactionStatus.CONFIRMED,
        type: FinancialTransactionType.CREDIT,
      },
      _sum: {
        amount: true,
      },
    });

    const debitTransactions = await this.prisma.financialTransaction.aggregate({
      where: {
        bankId,
        status: FinancialTransactionStatus.CONFIRMED,
        type: FinancialTransactionType.DEBIT,
      },
      _sum: {
        amount: true,
      },
    });

    // Calcular transferências de saída (débito)
    const transfersOut = await this.prisma.financialTransaction.aggregate({
      where: {
        transferFromBankId: bankId,
        status: FinancialTransactionStatus.CONFIRMED,
        type: FinancialTransactionType.TRANSFER,
      },
      _sum: {
        amount: true,
      },
    });

    // Calcular transferências de entrada (crédito)
    const transfersIn = await this.prisma.financialTransaction.aggregate({
      where: {
        transferToBankId: bankId,
        status: FinancialTransactionStatus.CONFIRMED,
        type: FinancialTransactionType.TRANSFER,
      },
      _sum: {
        amount: true,
      },
    });

    const credits = (creditTransactions._sum.amount || 0) + (transfersIn._sum.amount || 0);
    const debits = (debitTransactions._sum.amount || 0) + (transfersOut._sum.amount || 0);

    return credits - debits;
  }

  private mapTransactionType(type: FinancialTransactionType): 'CREDIT' | 'DEBIT' | 'TRANSFER' {
    switch (type) {
      case FinancialTransactionType.RECEIVABLE:
      case FinancialTransactionType.CREDIT:
        return 'CREDIT';
      case FinancialTransactionType.PAYABLE:
      case FinancialTransactionType.DEBIT:
        return 'DEBIT';
      case FinancialTransactionType.TRANSFER:
        return 'TRANSFER';
      default:
        return 'DEBIT';
    }
  }

  private mapTransactionStatus(status: FinancialTransactionStatus): 'PENDING' | 'CONFIRMED' | 'CANCELLED' {
    switch (status) {
      case FinancialTransactionStatus.PENDING:
      case FinancialTransactionStatus.OVERDUE:
        return 'PENDING';
      case FinancialTransactionStatus.PAID:
      case FinancialTransactionStatus.CONFIRMED:
        return 'CONFIRMED';
      case FinancialTransactionStatus.CANCELLED:
        return 'CANCELLED';
      default:
        return 'PENDING';
    }
  }
} 