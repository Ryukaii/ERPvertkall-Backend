import { IsString, IsEnum, IsOptional, IsNumber, IsDateString } from 'class-validator';
import { FinancialTransactionType } from '@prisma/client';

export class CreateBankTransactionDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNumber()
  amount: number; // Em centavos (positivo para crédito, negativo para débito)

  @IsDateString()
  transactionDate: string;

  @IsEnum(FinancialTransactionType)
  type: FinancialTransactionType; // CREDIT ou DEBIT

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsString()
  paymentMethodId?: string;
} 