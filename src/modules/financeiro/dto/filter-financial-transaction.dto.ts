import { IsOptional, IsDateString, IsEnum, IsString } from 'class-validator';
import { FinancialTransactionType, FinancialTransactionStatus } from '@prisma/client';

export class FilterFinancialTransactionDto {
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

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

  @IsString()
  @IsOptional()
  search?: string; // Para buscar por título ou descrição
} 