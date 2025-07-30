import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service';
import { CreateTagDto } from './dto/create-tag.dto';
import { UpdateTagDto } from './dto/update-tag.dto';
import { FilterTagDto } from './dto/filter-tag.dto';

@Injectable()
export class TagsService {
  constructor(private prisma: PrismaService) {}

  async create(createTagDto: CreateTagDto) {
    // Verificar se já existe uma tag com esse nome
    const existingTag = await this.prisma.tag.findUnique({
      where: { name: createTagDto.name }
    });

    if (existingTag) {
      throw new ConflictException('Uma tag com esse nome já existe');
    }

    return this.prisma.tag.create({
      data: createTagDto,
    });
  }

  async findAll(filterDto: FilterTagDto = {}) {
    const { name, isActive, page = 1, limit = 10 } = filterDto;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (name) {
      where.name = {
        contains: name,
        mode: 'insensitive',
      };
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    const [tags, total] = await Promise.all([
      this.prisma.tag.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
      }),
      this.prisma.tag.count({ where }),
    ]);

    return {
      data: tags,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const tag = await this.prisma.tag.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            financialTransactions: true,
            ofxPendingTransactions: true,
          },
        },
      },
    });

    if (!tag) {
      throw new NotFoundException('Tag não encontrada');
    }

    return tag;
  }

  async update(id: string, updateTagDto: UpdateTagDto) {
    await this.findOne(id); // Verifica se existe

    // Se está atualizando o nome, verificar se não conflita com outra tag
    if (updateTagDto.name) {
      const existingTag = await this.prisma.tag.findUnique({
        where: { name: updateTagDto.name }
      });

      if (existingTag && existingTag.id !== id) {
        throw new ConflictException('Uma tag com esse nome já existe');
      }
    }

    return this.prisma.tag.update({
      where: { id },
      data: updateTagDto,
    });
  }

  async remove(id: string) {
    await this.findOne(id); // Verifica se existe

    // Verificar se a tag está sendo usada em transações
    const tag = await this.prisma.tag.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            financialTransactions: true,
            ofxPendingTransactions: true,
          },
        },
      },
    });

    const totalUsages = (tag?._count.financialTransactions || 0) + (tag?._count.ofxPendingTransactions || 0);

    if (totalUsages > 0) {
      throw new ConflictException(
        `Não é possível excluir a tag pois ela está sendo usada em ${totalUsages} transação(ões). Desative-a em vez de excluí-la.`
      );
    }

    return this.prisma.tag.delete({
      where: { id },
    });
  }

  async toggleActive(id: string) {
    const tag = await this.findOne(id);
    
    return this.prisma.tag.update({
      where: { id },
      data: { isActive: !tag.isActive },
    });
  }

  // Método para buscar tags por IDs (útil para validações)
  async findByIds(ids: string[]) {
    return this.prisma.tag.findMany({
      where: {
        id: { in: ids },
        isActive: true,
      },
    });
  }

  // Método para buscar tags mais usadas
  async findMostUsed(limit: number = 10) {
    const tags = await this.prisma.tag.findMany({
      where: { isActive: true },
      include: {
        _count: {
          select: {
            financialTransactions: true,
            ofxPendingTransactions: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    // Calcular total de uso e ordenar
    const tagsWithUsage = tags.map(tag => ({
      ...tag,
      totalUsages: tag._count.financialTransactions + tag._count.ofxPendingTransactions,
    }))
    .sort((a, b) => b.totalUsages - a.totalUsages)
    .slice(0, limit);

    return tagsWithUsage;
  }
}