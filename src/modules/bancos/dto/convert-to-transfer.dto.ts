import { IsNotEmpty, IsNumber, Min, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class ConvertToTransferDto {
  @IsNotEmpty()
  @IsString()
  transactionId: string;

  @IsNotEmpty()
  @IsString()
  transferFromBankId: string;

  @IsNotEmpty()
  @IsString()
  transferToBankId: string;

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
  amount?: number; // Se não informado, usa o valor da transação original

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