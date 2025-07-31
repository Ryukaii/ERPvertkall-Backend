import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { DashboardFiltersDto } from './dto/dashboard-summary.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ModuleAccessGuard } from '../../common/guards/module-access.guard';
import { PermissionGuard } from '../../common/guards/permission.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequireModule } from '../../common/decorators/module.decorator';
import { Permission } from '../../common/decorators/permission.decorator';
import { User } from '@prisma/client';

@ApiTags('Dashboard')
@Controller('dashboard')
@UseGuards(JwtAuthGuard, ModuleAccessGuard, PermissionGuard)
@RequireModule('financeiro')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  @Permission('financeiro', 'financial_transactions', 'read')
  @ApiOperation({ summary: 'Obter resumo do dashboard com métricas e gráficos' })
  @ApiResponse({ 
    status: 200, 
    description: 'Resumo do dashboard obtido com sucesso',
    schema: {
      type: 'object',
      properties: {
        totalReceivable: { type: 'number', description: 'Total de receitas' },
        totalPayable: { type: 'number', description: 'Total de despesas' },
        totalPending: { type: 'number', description: 'Total pendente' },
        totalOverdue: { type: 'number', description: 'Total vencido' },
        monthlyData: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              month: { type: 'string', example: '2024-01' },
              receivable: { type: 'number' },
              payable: { type: 'number' },
              previstoRecebido: { type: 'number' },
              previstoPago: { type: 'number' },
              recebidoConfirmado: { type: 'number' },
              pagoConfirmado: { type: 'number' },
            },
          },
        },
        todayTransactions: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              title: { type: 'string' },
              amount: { type: 'number' },
              type: { type: 'string', enum: ['CREDIT', 'DEBIT'] },
              transactionDate: { type: 'string' },
              category: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  name: { type: 'string' },
                },
              },
            },
          },
        },
        overdueTransactions: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              title: { type: 'string' },
              amount: { type: 'number' },
              transactionDate: { type: 'string' },
              category: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  name: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
  })
  async getDashboardSummary(
    @Query() filters: DashboardFiltersDto,
    @CurrentUser() user: User,
  ) {
    return this.dashboardService.getDashboardSummary(filters, user.id);
  }
}