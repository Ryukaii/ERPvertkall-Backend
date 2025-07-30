import { IsString, IsNotEmpty, IsNumber, IsDateString, IsEnum, IsOptional, Min } from 'class-validator';
import { FinancialTransactionType, FinancialTransactionStatus } from '@prisma/client';
import { AmountToCents } from '../../../common/decorators/amount-to-cents.decorator';

export class CreateFinancialTransactionDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsOptional()
  description?: string;

  @IsNumber()
  @Min(0.01)
  @AmountToCents()
  amount: number;

  @IsDateString()
  dueDate: string;

  @IsDateString()
  @IsOptional()
  paidDate?: string;

  @IsEnum(FinancialTransactionType)
  type: FinancialTransactionType;

  @IsEnum(FinancialTransactionStatus)
  @IsOptional()
  status?: FinancialTransactionStatus = FinancialTransactionStatus.PENDING;

  @IsString()
  @IsNotEmpty()
  categoryId: string;

  @IsString()
  @IsOptional()
  paymentMethodId?: string;
} 