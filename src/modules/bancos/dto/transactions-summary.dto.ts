import { IsOptional, IsString, IsEnum, IsDateString, IsNumber, Min, Max } from 'class-validator';
import { FinancialTransactionType, FinancialTransactionStatus } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class TransactionFiltersDto {
  @ApiPropertyOptional({ description: 'ID do banco (ou "all" para todos)', example: 'bank_123' })
  @IsOptional()
  @IsString()
  bankId?: string;

  @ApiPropertyOptional({ description: 'Tipo da transação', enum: FinancialTransactionType })
  @IsOptional()
  @IsEnum(FinancialTransactionType)
  type?: FinancialTransactionType;

  @ApiPropertyOptional({ description: 'Status da transação', enum: FinancialTransactionStatus })
  @IsOptional()
  @IsEnum(FinancialTransactionStatus)
  status?: FinancialTransactionStatus;

  @ApiPropertyOptional({ description: 'ID da categoria', example: 'cat_123' })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional({ description: 'Data inicial (YYYY-MM-DD)', example: '2024-01-01' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'Data final (YYYY-MM-DD)', example: '2024-12-31' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Busca por título/descrição', example: 'pagamento' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Página', example: 1, default: 1 })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Limite por página', example: 20, default: 20 })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

interface TransactionSummary {
  totalTransactions: number;
  totalCredits: number;
  totalDebits: number;
  periodBalance: number;
}

interface TransactionItem {
  id: string;
  title: string;
  description?: string;
  amount: number;
  type: 'CREDIT' | 'DEBIT' | 'TRANSFER';
  transactionDate: string;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED';
  category?: {
    id: string;
    name: string;
  };
  bank?: {
    id: string;
    name: string;
    accountNumber: string;
    accountType: string;
  };
  transferFromBank?: {
    id: string;
    name: string;
  };
  transferToBank?: {
    id: string;
    name: string;
  };
}

interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface TransactionsSummaryResponse {
  summary: TransactionSummary;
  transactions: TransactionItem[];
  pagination: Pagination;
}