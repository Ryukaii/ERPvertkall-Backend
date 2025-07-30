import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service';
import { CreateBancoDto } from './dto/create-banco.dto';
import { UpdateBancoDto } from './dto/update-banco.dto';
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
} 