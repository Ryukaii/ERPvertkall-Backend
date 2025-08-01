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
import { ModuleAccessGuard } from '../../common/guards/module-access.guard';
import { PermissionGuard } from '../../common/guards/permission.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequireModule } from '../../common/decorators/module.decorator';
import { Permission } from '../../common/decorators/permission.decorator';
import { User } from '@prisma/client';
import { TransactionFiltersDto } from './dto/transactions-summary.dto';

@Controller('bancos')
@UseGuards(JwtAuthGuard, ModuleAccessGuard, PermissionGuard)
@RequireModule('bancos')
export class BancosController {
  constructor(
    private readonly bancosService: BancosService,
  ) {}

  @Post()
  @Permission('bancos', 'banks', 'write')
  create(@Body() createBancoDto: CreateBancoDto) {
    return this.bancosService.create(createBancoDto);
  }

  @Get()
  @Permission('bancos', 'banks', 'read')
  findAll() {
    return this.bancosService.findAll();
  }



  @Get('account-types')
  @Permission('bancos', 'banks', 'read')
  getAccountTypes() {
    return this.bancosService.getAccountTypes();
  }

  @Get('document-types')
  @Permission('bancos', 'banks', 'read')
  getDocumentTypes() {
    return this.bancosService.getDocumentTypes();
  }

  @Get(':id')
  @Permission('bancos', 'banks', 'read')
  findOne(@Param('id') id: string) {
    return this.bancosService.findOne(id);
  }

  @Get(':id/balance')
  @Permission('bancos', 'banks', 'read')
  getBalance(@Param('id') id: string) {
    return this.bancosService.getBalance(id);
  }

  @Patch(':id')
  @Permission('bancos', 'banks', 'write')
  update(
    @Param('id') id: string,
    @Body() updateBancoDto: UpdateBancoDto,
  ) {
    return this.bancosService.update(id, updateBancoDto);
  }

  @Delete(':id')
  @Permission('bancos', 'banks', 'write')
  remove(@Param('id') id: string) {
    return this.bancosService.remove(id);
  }

  @Get('transactions/summary')
  @Permission('bancos', 'bank_transactions', 'read')
  getTransactionsSummary(
    @CurrentUser() user: User,
    @Query() filters: TransactionFiltersDto,
  ) {
    return this.bancosService.getTransactionsSummary(filters, user.id);
  }

  @Get('with-balance')
  @Permission('bancos', 'banks', 'read')
  getBanksWithBalance() {
    return this.bancosService.getBanksWithBalance();
  }
} 