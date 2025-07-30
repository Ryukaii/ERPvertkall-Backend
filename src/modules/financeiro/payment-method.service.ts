import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service';
import { CreatePaymentMethodDto } from './dto/create-payment-method.dto';
import { UpdatePaymentMethodDto } from './dto/update-payment-method.dto';

@Injectable()
export class PaymentMethodService {
  constructor(private prisma: PrismaService) {}

  async create(createPaymentMethodDto: CreatePaymentMethodDto) {
    const { name, isActive } = createPaymentMethodDto;

    // Verificar se já existe método com este nome
    const existingMethod = await this.prisma.paymentMethod.findUnique({
      where: { name },
    });

    if (existingMethod) {
      throw new ConflictException('Já existe um método de pagamento com este nome');
    }

    return this.prisma.paymentMethod.create({
      data: {
        name,
        isActive: isActive ?? true,
      },
    });
  }

  async findAll(includeInactive: boolean = false) {
    const where = includeInactive ? {} : { isActive: true };
    
    return this.prisma.paymentMethod.findMany({
      where,
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const paymentMethod = await this.prisma.paymentMethod.findUnique({
      where: { id },
      include: {
        _count: {
          select: { transactions: true },
        },
      },
    });

    if (!paymentMethod) {
      throw new NotFoundException('Método de pagamento não encontrado');
    }

    return paymentMethod;
  }

  async update(id: string, updatePaymentMethodDto: UpdatePaymentMethodDto) {
    await this.findOne(id); // Verifica se existe

    // Se está alterando o nome, verificar se não existe outro com o mesmo nome
    if (updatePaymentMethodDto.name) {
      const existingMethod = await this.prisma.paymentMethod.findFirst({
        where: {
          name: updatePaymentMethodDto.name,
          NOT: { id },
        },
      });

      if (existingMethod) {
        throw new ConflictException('Já existe um método de pagamento com este nome');
      }
    }

    return this.prisma.paymentMethod.update({
      where: { id },
      data: updatePaymentMethodDto,
    });
  }

  async remove(id: string) {
    await this.findOne(id); // Verifica se existe

    // Verificar se o método possui transações
    const transactionCount = await this.prisma.financialTransaction.count({
      where: { paymentMethodId: id },
    });

    if (transactionCount > 0) {
      throw new ConflictException(
        'Não é possível excluir método de pagamento que possui transações vinculadas'
      );
    }

    return this.prisma.paymentMethod.delete({
      where: { id },
    });
  }
} 