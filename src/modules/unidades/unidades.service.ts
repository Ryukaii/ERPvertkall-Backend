import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service';
import { CreateUnidadeDto } from './dto/create-unidade.dto';
import { UpdateUnidadeDto } from './dto/update-unidade.dto';

@Injectable()
export class UnidadesService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateUnidadeDto) {
    return this.prisma.unidade.create({ data: dto });
  }

  async findAll() {
    return this.prisma.unidade.findMany();
  }

  async findOne(id: string) {
    const unidade = await this.prisma.unidade.findUnique({ where: { id } });
    if (!unidade) throw new NotFoundException('Unidade não encontrada');
    return unidade;
  }

  async update(id: string, dto: UpdateUnidadeDto) {
    return this.prisma.unidade.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.prisma.unidade.delete({ where: { id } });
    return { message: 'Unidade removida com sucesso' };
  }
} 