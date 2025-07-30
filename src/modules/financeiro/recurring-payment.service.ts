import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service';
import { CreateRecurringPaymentDto } from './dto/create-recurring-payment.dto';
import { UpdateRecurringPaymentDto } from './dto/update-recurring-payment.dto';
import { FilterRecurringPaymentDto } from './dto/filter-recurring-payment.dto';

@Injectable()
export class RecurringPaymentService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateRecurringPaymentDto) {
    return this.prisma.recurringPayment.create({ 
      data: dto, 
      include: { 
        paymentMethod: true,
        unidade: true
      } 
    });
  }

  async findAll(_filterDto: FilterRecurringPaymentDto) {
    // Filtros podem ser implementados depois
    return this.prisma.recurringPayment.findMany({ 
      orderBy: { createdAt: 'asc' }, 
      include: { 
        paymentMethod: true,
        unidade: true
      } 
    });
  }

  async findOne(id: string) {
    const recurringPayment = await this.prisma.recurringPayment.findUnique({
      where: { id },
      include: {
        paymentMethod: true,
        unidade: true
      }
    });

    if (!recurringPayment) {
      throw new NotFoundException(`Pagamento recorrente com ID ${id} não encontrado`);
    }

    return recurringPayment;
  }

  async update(id: string, dto: UpdateRecurringPaymentDto) {
    // Verifica se o pagamento recorrente existe
    await this.findOne(id);

    return this.prisma.recurringPayment.update({
      where: { id },
      data: dto,
      include: {
        paymentMethod: true,
        unidade: true
      }
    });
  }

  async remove(id: string) {
    // Verifica se o pagamento recorrente existe
    await this.findOne(id);

    return this.prisma.recurringPayment.delete({
      where: { id },
      include: {
        paymentMethod: true,
        unidade: true
      }
    });
  }
} 