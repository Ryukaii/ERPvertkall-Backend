import { IsString, IsEnum, IsOptional, IsNumber, Min } from 'class-validator';
import { BankAccountType, BankDocumentType } from '@prisma/client';

export class CreateBancoDto {
  @IsString()
  name: string;

  @IsString()
  accountNumber: string;

  @IsEnum(BankAccountType)
  accountType: BankAccountType;

  @IsOptional()
  @IsNumber()
  @Min(0)
  balance?: number; // Em centavos

  @IsEnum(BankDocumentType)
  documentType: BankDocumentType;

  @IsString()
  document: string; // CPF ou CNPJ

  @IsString()
  holderName: string; // Nome ou Razão Social
} 