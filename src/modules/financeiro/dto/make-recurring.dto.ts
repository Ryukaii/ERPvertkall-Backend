import { IsEnum, IsInt, IsOptional, IsDateString, Min, Max } from 'class-validator';
import { RecurrenceFrequency } from '@prisma/client';

export class MakeRecurringDto {
  @IsEnum(RecurrenceFrequency)
  frequency: RecurrenceFrequency;

  @IsInt()
  @Min(1)
  @Max(120) // Máximo de 120 parcelas (10 anos para mensal)
  interval: number;

  @IsOptional()
  @IsDateString()
  endDate?: string;
} 