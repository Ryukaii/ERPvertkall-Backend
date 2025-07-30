import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Patch, 
  Param, 
  Delete, 
  UseGuards, 
  Query,
  Put,
  UseInterceptors
} from '@nestjs/common';
import { FinancialTransactionService } from './financial-transaction.service';
import { CreateFinancialTransactionDto } from './dto/create-financial-transaction.dto';
import { UpdateFinancialTransactionDto } from './dto/update-financial-transaction.dto';
import { FilterFinancialTransactionDto } from './dto/filter-financial-transaction.dto';
import { MakeRecurringDto } from './dto/make-recurring.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ModuleAccessGuard } from '../../common/guards/module-access.guard';
import { PermissionGuard } from '../../common/guards/permission.guard';
import { RequireModule } from '../../common/decorators/module.decorator';
import { Permission } from '../../common/decorators/permission.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AmountTransformerInterceptor } from '../../common/interceptors/amount-transformer.interceptor';
import { DateTransformerInterceptor } from '../../common/interceptors/date-transformer.interceptor';

@Controller('financeiro/transactions')
@UseGuards(JwtAuthGuard, ModuleAccessGuard, PermissionGuard)
@RequireModule('financeiro')
@UseInterceptors(AmountTransformerInterceptor, DateTransformerInterceptor)
export class FinancialTransactionController {
  constructor(private readonly financialTransactionService: FinancialTransactionService) {}

  @Post()
  @Permission('financeiro', 'transactions', 'write')
  create(
    @Body() createFinancialTransactionDto: CreateFinancialTransactionDto,
    @CurrentUser() user: any
  ) {
    return this.financialTransactionService.create(createFinancialTransactionDto, user.id);
  }

  @Get()
  @Permission('financeiro', 'transactions', 'read')
  findAll(
    @Query() filterDto: FilterFinancialTransactionDto,
    @CurrentUser() user: any
  ) {
    return this.financialTransactionService.findAll(filterDto, user.id, user.isAdmin);
  }

  @Get('dashboard')
  @Permission('financeiro', 'transactions', 'read')
  getDashboard(
    @CurrentUser() user: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    return this.financialTransactionService.getDashboardSummary(user.id, startDate, endDate, user.isAdmin);
  }

  @Get(':id')
  @Permission('financeiro', 'transactions', 'read')
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.financialTransactionService.findOne(id, user.id, user.isAdmin);
  }

  @Patch(':id')
  @Permission('financeiro', 'transactions', 'write')
  update(
    @Param('id') id: string, 
    @Body() updateFinancialTransactionDto: UpdateFinancialTransactionDto,
    @CurrentUser() user: any
  ) {
    return this.financialTransactionService.update(id, updateFinancialTransactionDto, user.id, user.isAdmin);
  }

  @Put(':id/mark-as-paid')
  @Permission('financeiro', 'transactions', 'write')
  markAsPaid(
    @Param('id') id: string,
    @Body('paidDate') paidDate: string,
    @CurrentUser() user: any
  ) {
    return this.financialTransactionService.markAsPaid(id, user.id, paidDate, user.isAdmin);
  }

  @Put('mark-overdue')
  @Permission('financeiro', 'transactions', 'write')
  markAsOverdue(@CurrentUser() user: any) {
    return this.financialTransactionService.markAsOverdue(user.id, user.isAdmin);
  }

  @Delete(':id')
  @Permission('financeiro', 'transactions', 'write')
  remove(
    @Param('id') id: string, 
    @Query('deleteAllRecurring') deleteAllRecurring: string,
    @CurrentUser() user: any
  ) {
    const shouldDeleteAll = deleteAllRecurring === 'true';
    return this.financialTransactionService.remove(id, user.id, shouldDeleteAll, user.isAdmin);
  }

  @Post(':id/make-recurring')
  @Permission('financeiro', 'transactions', 'write')
  makeRecurring(
    @Param('id') id: string,
    @Body() makeRecurringDto: MakeRecurringDto,
    @CurrentUser() user: any
  ) {
    return this.financialTransactionService.makeRecurring(id, makeRecurringDto, user.id, user.isAdmin);
  }
} 