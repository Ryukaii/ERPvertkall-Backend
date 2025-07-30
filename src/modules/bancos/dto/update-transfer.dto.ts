import { IsOptional, IsNumber, IsString, Min, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateTransferDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1, { message: 'O valor deve ser maior que zero' })
  amount?: number; // Valor em centavos

  @IsOptional()
  @IsString()
  transferFromBankId?: string;

  @IsOptional()
  @IsString()
  transferToBankId?: string;

  @IsOptional()
  @IsDateString({}, { message: 'Data da transação deve ser uma data válida' })
  transactionDate?: string;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsString()
  paymentMethodId?: string;

  @IsOptional()
  @IsString({ each: true })
  tagIds?: string[];
} 