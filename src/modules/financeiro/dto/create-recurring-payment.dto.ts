import { IsString, IsNotEmpty, IsEnum, IsOptional, IsInt, Min, Max, ValidateIf } from 'class-validator';
import { RecurrenceType } from '@prisma/client';

export class CreateRecurringPaymentDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsEnum(RecurrenceType)
  recurrenceType: RecurrenceType;

  // Para recorrência semanal
  @ValidateIf(o => o.recurrenceType === 'WEEKLY')
  @IsInt()
  @Min(0)
  @Max(6)
  weekday?: number;

  // Para recorrência mensal e anual
  @ValidateIf(o => o.recurrenceType === 'MONTHLY' || o.recurrenceType === 'ANNUAL')
  @IsInt()
  @Min(1)
  @Max(31)
  day?: number;

  // Para recorrência anual
  @ValidateIf(o => o.recurrenceType === 'ANNUAL')
  @IsInt()
  @Min(1)
  @Max(12)
  month?: number;

  @IsString()
  @IsOptional()
  paymentMethodId?: string;

  @IsString()
  @IsOptional()
  unidadeId?: string;
} 