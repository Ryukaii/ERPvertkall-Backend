import { IsString, IsEnum, IsOptional, IsNumber, IsDateString, IsArray } from 'class-validator';
import { FinancialTransactionType } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateBankTransactionDto {
  @ApiProperty({ description: 'Título da transação', example: 'Salário' })
  @IsString()
  title: string;

  @ApiPropertyOptional({ description: 'Descrição da transação', example: 'Salário do mês' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Valor em centavos', example: 150000 })
  @IsNumber()
  amount: number; // Em centavos (positivo para crédito, negativo para débito)

  @ApiProperty({ description: 'Data da transação', example: '2024-01-15T10:00:00Z' })
  @IsDateString()
  transactionDate: string;

  @ApiProperty({ description: 'Tipo da transação', enum: FinancialTransactionType })
  @IsEnum(FinancialTransactionType)
  type: FinancialTransactionType; // CREDIT ou DEBIT

  @ApiPropertyOptional({ description: 'ID da categoria', example: 'cat_123' })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional({ description: 'ID do método de pagamento', example: 'pm_123' })
  @IsOptional()
  @IsString()
  paymentMethodId?: string;

  @ApiPropertyOptional({ 
    description: 'IDs das tags', 
    example: ['tag_123', 'tag_456'],
    type: [String]
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tagIds?: string[];
} 