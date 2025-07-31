import { IsOptional, IsDateString, IsEnum, IsString, IsNumber, Min, Max } from 'class-validator';
import { FinancialTransactionType, FinancialTransactionStatus } from '@prisma/client';
import { Type } from 'class-transformer';

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

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  page?: number = 1;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  @Max(100)
  limit?: number = 50;
} 