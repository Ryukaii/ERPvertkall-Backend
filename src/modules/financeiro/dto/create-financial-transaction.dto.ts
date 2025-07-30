import { IsString, IsNotEmpty, IsNumber, IsDateString, IsEnum, IsOptional, Min, IsArray } from 'class-validator';
import { FinancialTransactionType, FinancialTransactionStatus } from '@prisma/client';
import { AmountToCents } from '../../../common/decorators/amount-to-cents.decorator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateFinancialTransactionDto {
  @ApiProperty({ description: 'Título da transação', example: 'Pagamento de aluguel' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({ description: 'Descrição da transação', example: 'Aluguel do apartamento' })
  @IsOptional()
  description?: string;

  @ApiProperty({ description: 'Valor da transação', example: 1500.00 })
  @IsNumber()
  @Min(0.01)
  @AmountToCents()
  amount: number;

  @ApiProperty({ description: 'Data de vencimento', example: '2024-01-15T10:00:00Z' })
  @IsDateString()
  dueDate: string;

  @ApiPropertyOptional({ description: 'Data de pagamento', example: '2024-01-14T10:00:00Z' })
  @IsDateString()
  @IsOptional()
  paidDate?: string;

  @ApiProperty({ description: 'Tipo da transação', enum: FinancialTransactionType })
  @IsEnum(FinancialTransactionType)
  type: FinancialTransactionType;

  @ApiPropertyOptional({ description: 'Status da transação', enum: FinancialTransactionStatus })
  @IsEnum(FinancialTransactionStatus)
  @IsOptional()
  status?: FinancialTransactionStatus = FinancialTransactionStatus.PENDING;

  @ApiProperty({ description: 'ID da categoria', example: 'cat_123' })
  @IsString()
  @IsNotEmpty()
  categoryId: string;

  @ApiPropertyOptional({ description: 'ID do método de pagamento', example: 'pm_123' })
  @IsString()
  @IsOptional()
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