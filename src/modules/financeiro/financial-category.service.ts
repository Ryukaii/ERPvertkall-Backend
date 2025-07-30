import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service';
import { CreateFinancialCategoryDto } from './dto/create-financial-category.dto';
import { UpdateFinancialCategoryDto } from './dto/update-financial-category.dto';
import { FinancialTransactionType } from '@prisma/client';

@Injectable()
export class FinancialCategoryService {
  constructor(private prisma: PrismaService) {}

  async create(createFinancialCategoryDto: CreateFinancialCategoryDto) {
    const { name, description, type } = createFinancialCategoryDto;

    // Verificar se já existe categoria com este nome
    const existingCategory = await this.prisma.financialCategory.findUnique({
      where: { name },
    });

    if (existingCategory) {
      throw new ConflictException('Já existe uma categoria com este nome');
    }

    return this.prisma.financialCategory.create({
      data: {
        name,
        description,
        type,
      },
    });
  }

  async findAll(type?: FinancialTransactionType) {
    const where = type ? { type } : {};
    
    return this.prisma.financialCategory.findMany({
      where,
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const category = await this.prisma.financialCategory.findUnique({
      where: { id },
      include: {
        _count: {
          select: { transactions: true },
        },
      },
    });

    if (!category) {
      throw new NotFoundException('Categoria não encontrada');
    }

    return category;
  }

  async update(id: string, updateFinancialCategoryDto: UpdateFinancialCategoryDto) {
    await this.findOne(id); // Verifica se existe

    // Se está alterando o nome, verificar se não existe outro com o mesmo nome
    if (updateFinancialCategoryDto.name) {
      const existingCategory = await this.prisma.financialCategory.findFirst({
        where: {
          name: updateFinancialCategoryDto.name,
          NOT: { id },
        },
      });

      if (existingCategory) {
        throw new ConflictException('Já existe uma categoria com este nome');
      }
    }

    return this.prisma.financialCategory.update({
      where: { id },
      data: updateFinancialCategoryDto,
    });
  }

  async remove(id: string) {
    await this.findOne(id); // Verifica se existe

    // Verificar se a categoria possui transações
    const transactionCount = await this.prisma.financialTransaction.count({
      where: { categoryId: id },
    });

    if (transactionCount > 0) {
      throw new ConflictException(
        'Não é possível excluir categoria que possui transações vinculadas'
      );
    }

    return this.prisma.financialCategory.delete({
      where: { id },
    });
  }
} 