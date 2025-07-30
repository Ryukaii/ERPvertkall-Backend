import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreateBankTransactionDto } from './create-bank-transaction.dto';
import { IsString, IsEnum, IsOptional, IsNumber, IsDateString } from 'class-validator';
import { FinancialTransactionType } from '@prisma/client';

export class UpdateBankTransactionDto extends PartialType(
  OmitType(CreateBankTransactionDto, [] as const)
) {
  @IsString()
  @IsOptional()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNumber()
  @IsOptional()
  amount?: number; // Em centavos (positivo para crédito, negativo para débito)

  @IsDateString()
  @IsOptional()
  transactionDate?: string;

  @IsEnum(FinancialTransactionType)
  @IsOptional()
  type?: FinancialTransactionType; // CREDIT ou DEBIT

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsString()
  paymentMethodId?: string;
} 