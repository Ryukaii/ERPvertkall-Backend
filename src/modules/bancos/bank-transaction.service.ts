import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service';
import { CreateBankTransactionDto } from './dto/create-bank-transaction.dto';
import { UpdateBankTransactionDto } from './dto/update-bank-transaction.dto';
import { FilterBankTransactionDto } from './dto/filter-bank-transaction.dto';
import { CreateTransferDto } from './dto/create-transfer.dto';
import { UpdateTransferDto } from './dto/update-transfer.dto';
import { ConvertToTransferDto } from './dto/convert-to-transfer.dto';
import { FinancialTransaction, FinancialTransactionType, FinancialTransactionStatus } from '@prisma/client';
import { TagsService } from '../tags/tags.service';

@Injectable()
export class BankTransactionService {
  constructor(
    private prisma: PrismaService,
    private tagsService: TagsService,
  ) {}

  async create(createTransactionDto: CreateBankTransactionDto, bankId: string, userId: string): Promise<FinancialTransaction> {
    const { tagIds, ...transactionData } = createTransactionDto;

    // Verificar se o banco existe
    const bank = await this.prisma.bank.findUnique({
      where: { id: bankId },
    });

    if (!bank) {
      throw new NotFoundException('Banco não encontrado');
    }

    // Validar tags se fornecidas
    if (tagIds && tagIds.length > 0) {
      const validTags = await this.tagsService.findByIds(tagIds);
      if (validTags.length !== tagIds.length) {
        throw new BadRequestException('Uma ou mais tags são inválidas ou estão inativas');
      }
    }

    // Criar transação
    const transaction = await this.prisma.financialTransaction.create({
      data: {
        ...transactionData,
        transactionDate: new Date(transactionData.transactionDate),
        bankId,
        userId, // Adicionando userId obrigatório
        // Para transações bancárias, não usamos dueDate
        dueDate: null,
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
    return this.prisma.financialTransaction.findUniqueOrThrow({
      where: { id: transaction.id },
      include: {
        bank: true,
        category: true,
        paymentMethod: true,
        tags: {
          include: {
            tag: true,
          },
        },
      },
    });
  }

  async findAll(bankId: string, filters?: FilterBankTransactionDto): Promise<FinancialTransaction[]> {
    const { page = 1, limit = 50 } = filters || {};
    const offset = (page - 1) * limit;
    
    const where: any = {
      bankId,
      type: {
        in: ['CREDIT', 'DEBIT', 'TRANSFER']
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

    return this.prisma.findManyOptimized(
      this.prisma.financialTransaction,
      {
        where,
        select: {
          id: true,
          title: true,
          description: true,
          amount: true,
          transactionDate: true,
          type: true,
          status: true,
          bankId: true,
          categoryId: true,
          paymentMethodId: true,
          transferFromBankId: true,
          transferToBankId: true,
          linkedTransactionId: true,
          createdAt: true,
          updatedAt: true,
          bank: {
            select: {
              id: true,
              name: true,
              accountNumber: true,
              accountType: true,
            },
          },
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
          transferFromBank: {
            select: {
              id: true,
              name: true,
              accountNumber: true,
            },
          },
          transferToBank: {
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
        orderBy: {
          transactionDate: 'desc',
        },
        skip: offset,
        take: limit,
      },
      { useRetry: true, maxRetries: 2 }
    );
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
    const { tagIds, ...transactionData } = updateTransactionDto;

    // Verificar se a transação existe e pertence ao banco
    await this.findOne(id, bankId);

    // Validar tags se fornecidas
    if (tagIds && tagIds.length > 0) {
      const validTags = await this.tagsService.findByIds(tagIds);
      if (validTags.length !== tagIds.length) {
        throw new BadRequestException('Uma ou mais tags são inválidas ou estão inativas');
      }
    }

    // Filtrar apenas campos que foram fornecidos para evitar problemas com undefined
    const updateData: any = {};
    
    // Apenas adicionar campos que não são undefined
    Object.keys(transactionData).forEach(key => {
      const value = transactionData[key];
      if (value !== undefined) {
        updateData[key] = value;
      }
    });

    // Converter data se fornecida
    if (transactionData.transactionDate) {
      updateData.transactionDate = new Date(transactionData.transactionDate);
    }

    // Verificar se há dados para atualizar (incluindo tags)
    if (Object.keys(updateData).length === 0 && tagIds === undefined) {
      throw new BadRequestException('Nenhum campo fornecido para atualização');
    }

    // Atualizar transação
    const updatedTransaction = await this.prisma.financialTransaction.update({
      where: { id },
      data: updateData,
    });

    // Atualizar tags se fornecidas
    if (tagIds !== undefined) {
      // Remover tags existentes
      await this.prisma.financialTransactionTag.deleteMany({
        where: { financialTransactionId: id },
      });

      // Adicionar novas tags
      if (tagIds.length > 0) {
        await this.prisma.financialTransactionTag.createMany({
          data: tagIds.map(tagId => ({
            financialTransactionId: id,
            tagId,
          })),
        });
      }
    }

    // Retornar transação atualizada com todos os relacionamentos
    return this.prisma.financialTransaction.findUniqueOrThrow({
      where: { id },
      include: {
        bank: true,
        category: true,
        paymentMethod: true,
        tags: {
          include: {
            tag: true,
          },
        },
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
    const { page = 1, limit = 50 } = filters || {};
    const offset = (page - 1) * limit;
    
    const where: any = {
      type: {
        in: ['CREDIT', 'DEBIT', 'TRANSFER']
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

    return this.prisma.findManyOptimized(
      this.prisma.financialTransaction,
      {
        where,
        select: {
          id: true,
          title: true,
          description: true,
          amount: true,
          transactionDate: true,
          type: true,
          status: true,
          bankId: true,
          categoryId: true,
          paymentMethodId: true,
          transferFromBankId: true,
          transferToBankId: true,
          linkedTransactionId: true,
          createdAt: true,
          updatedAt: true,
          bank: {
            select: {
              id: true,
              name: true,
              accountNumber: true,
              accountType: true,
            },
          },
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
          transferFromBank: {
            select: {
              id: true,
              name: true,
              accountNumber: true,
            },
          },
          transferToBank: {
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
        orderBy: {
          transactionDate: 'desc',
        },
        skip: offset,
        take: limit,
      },
      { useRetry: true, maxRetries: 2 }
    );
  }

  async createTransfer(createTransferDto: CreateTransferDto, userId: string): Promise<{ transferTransaction: FinancialTransaction }> {
    const { transferFromBankId, transferToBankId, amount, transactionDate, tagIds, ...transferData } = createTransferDto;

    // Verificar se as contas existem e são diferentes
    if (transferFromBankId === transferToBankId) {
      throw new BadRequestException('A conta de origem e destino devem ser diferentes');
    }

    const [fromBank, toBank] = await Promise.all([
      this.prisma.bank.findUnique({ where: { id: transferFromBankId } }),
      this.prisma.bank.findUnique({ where: { id: transferToBankId } }),
    ]);

    if (!fromBank) {
      throw new NotFoundException('Conta de origem não encontrada');
    }

    if (!toBank) {
      throw new NotFoundException('Conta de destino não encontrada');
    }

    if (!fromBank.isActive) {
      throw new BadRequestException('Conta de origem está inativa');
    }

    if (!toBank.isActive) {
      throw new BadRequestException('Conta de destino está inativa');
    }

    // Permitir transferências mesmo com saldo insuficiente
    // const fromBankBalance = await this.calculateBankBalance(transferFromBankId, userId);
    // if (fromBankBalance < amount) {
    //   throw new BadRequestException('Saldo insuficiente na conta de origem');
    // }

    // Validar tags se fornecidas
    if (tagIds && tagIds.length > 0) {
      const validTags = await this.tagsService.findByIds(tagIds);
      if (validTags.length !== tagIds.length) {
        throw new BadRequestException('Uma ou mais tags são inválidas ou estão inativas');
      }
    }

    const transferDate = transactionDate ? new Date(transactionDate) : new Date();

    try {
      // Criar uma única transação do tipo TRANSFER
      const transferTransaction = await this.prisma.financialTransaction.create({
        data: {
          ...transferData,
          amount: amount, // Valor positivo da transferência
          type: FinancialTransactionType.TRANSFER,
          status: FinancialTransactionStatus.CONFIRMED,
          transactionDate: transferDate,
          bankId: transferFromBankId, // Banco principal (origem)
          transferFromBankId: transferFromBankId,
          transferToBankId: transferToBankId,
          userId,
          dueDate: null,
        },
        include: {
          bank: true,
          category: true,
          paymentMethod: true,
          transferFromBank: true,
          transferToBank: true,
          tags: { include: { tag: true } },
        },
      });

      // Adicionar tags se fornecidas
      if (tagIds && tagIds.length > 0) {
        const tagData = tagIds.map((tagId) => ({
          financialTransactionId: transferTransaction.id,
          tagId,
        }));

        await this.prisma.financialTransactionTag.createMany({
          data: tagData,
        });

        // Buscar novamente com as tags
        const transferWithTags = await this.prisma.financialTransaction.findUnique({
          where: { id: transferTransaction.id },
          include: {
            bank: true,
            category: true,
            paymentMethod: true,
            transferFromBank: true,
            transferToBank: true,
            tags: { include: { tag: true } },
          },
        });

        return {
          transferTransaction: transferWithTags!,
        };
      }

      return {
        transferTransaction,
      };
    } catch (error) {
      throw new BadRequestException('Erro ao criar transferência: ' + (error as Error).message);
    }
  }

  private async calculateBankBalance(bankId: string, userId: string): Promise<number> {
    const transactions = await this.prisma.financialTransaction.aggregate({
      where: {
        bankId,
        userId,
        status: {
          in: [FinancialTransactionStatus.CONFIRMED, FinancialTransactionStatus.PAID],
        },
      },
      _sum: {
        amount: true,
      },
    });

    return transactions._sum.amount || 0;
  }

  async findTransfer(transferId: string, userId: string): Promise<{ transferTransaction: FinancialTransaction }> {
    // Buscar a transação do tipo TRANSFER
    const transferTransaction = await this.prisma.financialTransaction.findFirst({
      where: {
        id: transferId,
        userId,
        type: FinancialTransactionType.TRANSFER,
        transferFromBankId: { not: null },
        transferToBankId: { not: null },
      },
      include: {
        bank: true,
        category: true,
        paymentMethod: true,
        transferFromBank: true,
        transferToBank: true,
        tags: { include: { tag: true } },
      },
    });

    if (!transferTransaction) {
      throw new NotFoundException('Transferência não encontrada');
    }

    return { transferTransaction };
  }

  async updateTransfer(
    transferId: string,
    updateTransferDto: UpdateTransferDto,
    userId: string,
  ): Promise<{ transferTransaction: FinancialTransaction }> {
    const { amount, transactionDate, tagIds, ...updateData } = updateTransferDto;

    // Buscar a transferência
    const { transferTransaction } = await this.findTransfer(transferId, userId);

    // Validar tags se fornecidas
    if (tagIds && tagIds.length > 0) {
      const validTags = await this.tagsService.findByIds(tagIds);
      if (validTags.length !== tagIds.length) {
        throw new BadRequestException('Uma ou mais tags são inválidas ou estão inativas');
      }
    }

    const transferDate = transactionDate ? new Date(transactionDate) : transferTransaction.transactionDate;

    try {
      // Atualizar a transação de transferência
      const updatedTransfer = await this.prisma.financialTransaction.update({
        where: { id: transferTransaction.id },
        data: {
          ...updateData,
          amount: amount || transferTransaction.amount,
          transactionDate: transferDate,
        },
        include: {
          bank: true,
          category: true,
          paymentMethod: true,
          transferFromBank: true,
          transferToBank: true,
          tags: { include: { tag: true } },
        },
      });

      // Atualizar tags se fornecidas
      if (tagIds) {
        // Remover tags existentes
        await this.prisma.financialTransactionTag.deleteMany({
          where: {
            financialTransactionId: transferTransaction.id,
          },
        });

        // Adicionar novas tags
        if (tagIds.length > 0) {
          const tagData = tagIds.map((tagId) => ({
            financialTransactionId: transferTransaction.id,
            tagId,
          }));

          await this.prisma.financialTransactionTag.createMany({
            data: tagData,
          });

          // Buscar novamente com as tags atualizadas
          const transferWithTags = await this.prisma.financialTransaction.findUnique({
            where: { id: transferTransaction.id },
            include: {
              bank: true,
              category: true,
              paymentMethod: true,
              transferFromBank: true,
              transferToBank: true,
              tags: { include: { tag: true } },
            },
          });

          return {
            transferTransaction: transferWithTags!,
          };
        }
      }

      return {
        transferTransaction: updatedTransfer,
      };
    } catch (error) {
      throw new BadRequestException('Erro ao atualizar transferência: ' + (error as Error).message);
    }
  }

  async deleteTransfer(transferId: string, userId: string): Promise<void> {
    // Buscar a transferência
    const { transferTransaction } = await this.findTransfer(transferId, userId);

    try {
      await this.prisma.$transaction(async (prisma) => {
        // Remover tags da transação
        await prisma.financialTransactionTag.deleteMany({
          where: {
            financialTransactionId: transferTransaction.id,
          },
        });

        // Remover a transação
        await prisma.financialTransaction.delete({
          where: {
            id: transferTransaction.id,
          },
        });
      });
    } catch (error) {
      throw new BadRequestException('Erro ao excluir transferência: ' + (error as Error).message);
    }
  }

  async convertToTransfer(convertDto: ConvertToTransferDto, userId: string): Promise<{ transferTransaction: FinancialTransaction }> {
    const { transactionId, transferFromBankId, transferToBankId, amount, tagIds, ...convertData } = convertDto;

    // Verificar se as contas existem e são diferentes
    if (transferFromBankId === transferToBankId) {
      throw new BadRequestException('A conta de origem e destino devem ser diferentes');
    }

    const [fromBank, toBank] = await Promise.all([
      this.prisma.bank.findUnique({ where: { id: transferFromBankId } }),
      this.prisma.bank.findUnique({ where: { id: transferToBankId } }),
    ]);

    if (!fromBank) {
      throw new NotFoundException('Conta de origem não encontrada');
    }

    if (!toBank) {
      throw new NotFoundException('Conta de destino não encontrada');
    }

    if (!fromBank.isActive) {
      throw new BadRequestException('Conta de origem está inativa');
    }

    if (!toBank.isActive) {
      throw new BadRequestException('Conta de destino está inativa');
    }

    // Buscar a transação original
    const originalTransaction = await this.prisma.financialTransaction.findFirst({
      where: {
        id: transactionId,
        userId,
        linkedTransactionId: null, // Não deve ser uma transferência já existente
        transferFromBankId: null, // Não deve ser uma transferência já existente
        transferToBankId: null, // Não deve ser uma transferência já existente
      },
      include: {
        bank: true,
        category: true,
        paymentMethod: true,
        tags: { include: { tag: true } },
      },
    });

    if (!originalTransaction) {
      throw new NotFoundException('Transação não encontrada ou já é uma transferência');
    }

    // Verificar se a transação original pertence à conta de origem
    if (originalTransaction.bankId !== transferFromBankId) {
      throw new BadRequestException('A transação original deve pertencer à conta de origem');
    }

    // Permitir conversão mesmo com saldo insuficiente
    const transferAmount = amount || Math.abs(originalTransaction.amount);
    // const fromBankBalance = await this.calculateBankBalance(transferFromBankId, userId);
    // if (fromBankBalance < transferAmount) {
    //   throw new BadRequestException('Saldo insuficiente na conta de origem');
    // }

    // Validar tags se fornecidas
    if (tagIds && tagIds.length > 0) {
      const validTags = await this.tagsService.findByIds(tagIds);
      if (validTags.length !== tagIds.length) {
        throw new BadRequestException('Uma ou mais tags são inválidas ou estão inativas');
      }
    }

    try {
      // Atualizar a transação original para ser uma transferência
      const transferTransaction = await this.prisma.financialTransaction.update({
        where: { id: originalTransaction.id },
        data: {
          ...convertData,
          title: convertData.title || originalTransaction.title,
          description: convertData.description || originalTransaction.description,
          amount: transferAmount, // Valor positivo da transferência
          type: FinancialTransactionType.TRANSFER,
          status: FinancialTransactionStatus.CONFIRMED,
          bankId: transferFromBankId, // Banco principal (origem)
          transferFromBankId: transferFromBankId,
          transferToBankId: transferToBankId,
          dueDate: null, // Transferências não têm dueDate
          linkedTransactionId: null, // Limpar link anterior se existir
        },
        include: {
          bank: true,
          category: true,
          paymentMethod: true,
          transferFromBank: true,
          transferToBank: true,
          tags: { include: { tag: true } },
        },
      });

      // Gerenciar tags: remover antigas e adicionar novas se fornecidas
      if (tagIds && tagIds.length > 0) {
        // Remover tags antigas
        await this.prisma.financialTransactionTag.deleteMany({
          where: { financialTransactionId: transferTransaction.id },
        });

        // Adicionar novas tags
        const tagData = tagIds.map((tagId) => ({
          financialTransactionId: transferTransaction.id,
          tagId,
        }));

        await this.prisma.financialTransactionTag.createMany({
          data: tagData,
        });

        // Buscar novamente com as tags atualizadas
        const transferWithTags = await this.prisma.financialTransaction.findUnique({
          where: { id: transferTransaction.id },
          include: {
            bank: true,
            category: true,
            paymentMethod: true,
            transferFromBank: true,
            transferToBank: true,
            tags: { include: { tag: true } },
          },
        });

        return {
          transferTransaction: transferWithTags!,
        };
      }

      return {
        transferTransaction,
      };
    } catch (error) {
      throw new BadRequestException('Erro ao converter transação em transferência: ' + (error as Error).message);
    }
  }
} 