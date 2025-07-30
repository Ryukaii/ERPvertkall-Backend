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
import { BancosService } from './bancos.service';
import { CreateBancoDto } from './dto/create-banco.dto';
import { UpdateBancoDto } from './dto/update-banco.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '@prisma/client';
import { BankTransactionService } from './bank-transaction.service';
import { FilterBankTransactionDto } from './dto/filter-bank-transaction.dto';

@Controller('bancos')
@UseGuards(JwtAuthGuard)
export class BancosController {
  constructor(
    private readonly bancosService: BancosService,
    private readonly bankTransactionService: BankTransactionService,
  ) {}

  @Post()
  create(@Body() createBancoDto: CreateBancoDto) {
    return this.bancosService.create(createBancoDto);
  }

  @Get()
  findAll() {
    return this.bancosService.findAll();
  }

  @Get('transactions')
  findAllTransactions(
    @CurrentUser() user: User,
    @Query() filters: FilterBankTransactionDto,
  ) {
    // Se o parâmetro 'all' estiver presente e for true, retorna todas as transações
    // Senão, retorna apenas as transações do usuário atual
    const shouldReturnAll = filters.all === true;
    const userId = shouldReturnAll ? undefined : user.id;
    
    return this.bankTransactionService.findAllTransactions(filters, userId);
  }

  @Get('account-types')
  getAccountTypes() {
    return this.bancosService.getAccountTypes();
  }

  @Get('document-types')
  getDocumentTypes() {
    return this.bancosService.getDocumentTypes();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.bancosService.findOne(id);
  }

  @Get(':id/balance')
  getBalance(@Param('id') id: string) {
    return this.bancosService.getBalance(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateBancoDto: UpdateBancoDto,
  ) {
    return this.bancosService.update(id, updateBancoDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.bancosService.remove(id);
  }
} 