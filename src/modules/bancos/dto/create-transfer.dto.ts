import { IsNotEmpty, IsNumber, IsOptional, IsString, Min, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateTransferDto {
  @IsNotEmpty()
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  @Min(1, { message: 'O valor deve ser maior que zero' })
  amount: number; // Valor em centavos

  @IsNotEmpty()
  @IsString()
  transferFromBankId: string;

  @IsNotEmpty()
  @IsString()
  transferToBankId: string;

  @IsOptional()
  @IsDateString({}, { message: 'Data da transação deve ser uma data válida' })
  transactionDate?: string; // Se não informado, usa a data atual

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