import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreateFinancialTransactionDto } from './create-financial-transaction.dto';
import { IsString, IsNumber, IsDateString, IsEnum, IsOptional, Min } from 'class-validator';
import { FinancialTransactionType, FinancialTransactionStatus } from '@prisma/client';
import { AmountToCents } from '../../../common/decorators/amount-to-cents.decorator';

export class UpdateFinancialTransactionDto extends PartialType(
  OmitType(CreateFinancialTransactionDto, [] as const)
) {
  @IsString()
  @IsOptional()
  title?: string;

  @IsOptional()
  description?: string;

  @IsNumber()
  @Min(0.01)
  @AmountToCents()
  @IsOptional()
  amount?: number;

  @IsDateString()
  @IsOptional()
  dueDate?: string;

  @IsDateString()
  @IsOptional()
  paidDate?: string;

  @IsEnum(FinancialTransactionType)
  @IsOptional()
  type?: FinancialTransactionType;

  @IsEnum(FinancialTransactionStatus)
  @IsOptional()
  status?: FinancialTransactionStatus;

  @IsString()
  @IsOptional()
  categoryId?: string;

  @IsString()
  @IsOptional()
  paymentMethodId?: string;
} 