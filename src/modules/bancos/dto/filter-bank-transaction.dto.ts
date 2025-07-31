import { IsOptional, IsString, IsEnum, IsDateString, IsBoolean, IsNumber, Min, Max } from 'class-validator';
import { FinancialTransactionType, FinancialTransactionStatus } from '@prisma/client';
import { Transform, Type } from 'class-transformer';

export class FilterBankTransactionDto {
  @IsOptional()
  @IsString()
  bankId?: string;

  @IsOptional()
  @IsEnum(FinancialTransactionType)
  type?: FinancialTransactionType;

  @IsOptional()
  @IsEnum(FinancialTransactionStatus)
  status?: FinancialTransactionStatus;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsString()
  paymentMethodId?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  all?: boolean;

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