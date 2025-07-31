import { IsOptional, IsString, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class DashboardFiltersDto {
  @ApiPropertyOptional({ description: 'ID do banco específico', example: 'bank_123' })
  @IsOptional()
  @IsString()
  bankId?: string;

  @ApiPropertyOptional({ description: 'Data inicial (YYYY-MM-DD)', example: '2024-01-01' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'Data final (YYYY-MM-DD)', example: '2024-12-31' })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}

interface MonthlyData {
  month: string;
  receivable: number;
  payable: number;
  previstoRecebido: number;
  previstoPago: number;
  recebidoConfirmado: number;
  pagoConfirmado: number;
}

interface TodayTransaction {
  id: string;
  title: string;
  amount: number;
  type: 'CREDIT' | 'DEBIT';
  transactionDate: string;
  category?: {
    id: string;
    name: string;
  };
}

interface OverdueTransaction {
  id: string;
  title: string;
  amount: number;
  transactionDate: string;
  category?: {
    id: string;
    name: string;
  };
}

export interface DashboardSummaryResponse {
  // Métricas principais
  totalReceivable: number;
  totalPayable: number;
  totalPending: number;
  totalOverdue: number;
  
  // Dados para gráficos
  monthlyData: MonthlyData[];
  
  // Transações para hoje
  todayTransactions: TodayTransaction[];
  
  // Transações vencidas
  overdueTransactions: OverdueTransaction[];
}