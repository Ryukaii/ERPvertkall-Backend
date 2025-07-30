import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';
import { FinancialTransactionType } from '@prisma/client';

export class CreateFinancialCategoryDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(FinancialTransactionType)
  type: FinancialTransactionType;
} 