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
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User, FinancialTransactionStatus } from '@prisma/client';

@Controller('bancos/:bankId/transactions')
@UseGuards(JwtAuthGuard)
export class BankTransactionController {
  constructor(private readonly bankTransactionService: BankTransactionService) {}

  @Post()
  create(
    @Param('bankId') bankId: string,
    @Body() createTransactionDto: CreateBankTransactionDto,
    @CurrentUser() user: User,
  ) {
    return this.bankTransactionService.create(createTransactionDto, bankId, user.id);
  }

  @Get()
  findAll(
    @Param('bankId') bankId: string,
    @CurrentUser() user: User,
    @Query() filters: FilterBankTransactionDto,
  ) {
    return this.bankTransactionService.findAll(bankId, filters);
  }

  @Get('summary')
  getSummary(
    @Param('bankId') bankId: string,
    @CurrentUser() user: User,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.bankTransactionService.getTransactionSummary(bankId, startDate, endDate);
  }

  @Get(':id')
  findOne(
    @Param('bankId') bankId: string,
    @Param('id') id: string,
    @CurrentUser() user: User,
  ) {
    return this.bankTransactionService.findOne(id, bankId);
  }

  @Patch(':id')
  update(
    @Param('bankId') bankId: string,
    @Param('id') id: string,
    @Body() updateTransactionDto: UpdateBankTransactionDto,
    @CurrentUser() user: User,
  ) {
    return this.bankTransactionService.update(id, updateTransactionDto, bankId);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('bankId') bankId: string,
    @Param('id') id: string,
    @Body('status') status: FinancialTransactionStatus,
    @CurrentUser() user: User,
  ) {
    return this.bankTransactionService.updateStatus(id, status, bankId);
  }

  @Delete(':id')
  remove(
    @Param('bankId') bankId: string,
    @Param('id') id: string,
    @CurrentUser() user: User,
  ) {
    return this.bankTransactionService.remove(id, bankId);
  }
} 