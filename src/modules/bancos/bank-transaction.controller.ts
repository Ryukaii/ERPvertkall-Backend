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
} from '@nestjs/common';
import { BankTransactionService } from './bank-transaction.service';
import { CreateBankTransactionDto } from './dto/create-bank-transaction.dto';
import { UpdateBankTransactionDto } from './dto/update-bank-transaction.dto';
import { FilterBankTransactionDto } from './dto/filter-bank-transaction.dto';
import { CreateTransferDto } from './dto/create-transfer.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ModuleAccessGuard } from '../../common/guards/module-access.guard';
import { PermissionGuard } from '../../common/guards/permission.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequireModule } from '../../common/decorators/module.decorator';
import { Permission } from '../../common/decorators/permission.decorator';
import { User, FinancialTransactionStatus } from '@prisma/client';

@Controller('bancos/:bankId/transactions')
@UseGuards(JwtAuthGuard, ModuleAccessGuard, PermissionGuard)
@RequireModule('bancos')
export class BankTransactionController {
  constructor(private readonly bankTransactionService: BankTransactionService) {}

  @Post()
  @Permission('bancos', 'bank_transactions', 'write')
  create(
    @Param('bankId') bankId: string,
    @Body() createTransactionDto: CreateBankTransactionDto,
    @CurrentUser() user: User,
  ) {
    return this.bankTransactionService.create(createTransactionDto, bankId, user.id);
  }

  @Get()
  @Permission('bancos', 'bank_transactions', 'read')
  findAll(
    @Param('bankId') bankId: string,
    @CurrentUser() user: User,
    @Query() filters: FilterBankTransactionDto,
  ) {
    return this.bankTransactionService.findAll(bankId, filters);
  }

  @Get('summary')
  @Permission('bancos', 'bank_transactions', 'read')
  getSummary(
    @Param('bankId') bankId: string,
    @CurrentUser() user: User,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.bankTransactionService.getTransactionSummary(bankId, startDate, endDate);
  }

  @Get(':id')
  @Permission('bancos', 'bank_transactions', 'read')
  findOne(
    @Param('bankId') bankId: string,
    @Param('id') id: string,
    @CurrentUser() user: User,
  ) {
    return this.bankTransactionService.findOne(id, bankId);
  }

  @Patch(':id')
  @Permission('bancos', 'bank_transactions', 'write')
  update(
    @Param('bankId') bankId: string,
    @Param('id') id: string,
    @Body() updateTransactionDto: UpdateBankTransactionDto,
    @CurrentUser() user: User,
  ) {
    return this.bankTransactionService.update(id, updateTransactionDto, bankId);
  }

  @Patch(':id/status')
  @Permission('bancos', 'bank_transactions', 'write')
  updateStatus(
    @Param('bankId') bankId: string,
    @Param('id') id: string,
    @Body('status') status: FinancialTransactionStatus,
    @CurrentUser() user: User,
  ) {
    return this.bankTransactionService.updateStatus(id, status, bankId);
  }

  @Delete(':id')
  @Permission('bancos', 'bank_transactions', 'write')
  remove(
    @Param('bankId') bankId: string,
    @Param('id') id: string,
    @CurrentUser() user: User,
  ) {
    return this.bankTransactionService.remove(id, bankId);
  }
} 