import { IsString, IsNumber, IsOptional, IsEnum } from 'class-validator';
import { FinancialTransactionType } from '@prisma/client';

export class CategorySuggestionDto {
  @IsString()
  categoryId: string;

  @IsString()
  categoryName: string;

  @IsNumber()
  confidence: number;

  @IsString()
  reasoning: string;
}

export class CategorizeTransactionDto {
  @IsString()
  categoryId: string;

  @IsNumber()
  @IsOptional()
  confidence?: number;

  @IsString()
  @IsOptional()
  reasoning?: string;
}

export class TransactionInfoDto {
  @IsString()
  id: string;

  @IsString()
  title: string;

  @IsString()
  @IsOptional()
  description?: string | null;

  @IsNumber()
  amount: number;

  @IsEnum(FinancialTransactionType)
  type: FinancialTransactionType;

  @IsString()
  @IsOptional()
  transactionDate?: string | null;
}

export class CategorizationResponseDto {
  @IsString()
  transactionId: string;

  @IsOptional()
  suggestion?: CategorySuggestionDto | null;

  @IsOptional()
  transaction?: TransactionInfoDto;

  @IsOptional()
  autoApplied?: boolean;

  @IsOptional()
  message?: string;
}

export class BatchCategorizationResponseDto {
  @IsString()
  message: string;

  @IsOptional()
  suggestions?: Array<{
    transactionId: string;
    transactionTitle: string;
    suggestion: CategorySuggestionDto;
  }>;
} 