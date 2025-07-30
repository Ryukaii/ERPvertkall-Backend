import { IsOptional, IsString, IsEnum, IsDateString, IsBoolean } from 'class-validator';
import { FinancialTransactionType, FinancialTransactionStatus } from '@prisma/client';
import { Transform } from 'class-transformer';

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
} 