import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  Param,
  Patch,
  Delete,
} from '@nestjs/common';
import { BankTransactionService } from './bank-transaction.service';
import { CreateTransferDto } from './dto/create-transfer.dto';
import { UpdateTransferDto } from './dto/update-transfer.dto';
import { ConvertToTransferDto } from './dto/convert-to-transfer.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '@prisma/client';

@Controller('bancos/transfers')
@UseGuards(JwtAuthGuard)
export class TransferController {
  constructor(private readonly bankTransactionService: BankTransactionService) {}

  @Post()
  async createTransfer(
    @Body() createTransferDto: CreateTransferDto,
    @CurrentUser() user: User,
  ) {
    const result = await this.bankTransactionService.createTransfer(createTransferDto, user.id);
    
    return {
      message: 'Transferência realizada com sucesso',
      transfer: {
        id: result.transferTransaction.id,
        amount: result.transferTransaction.amount,
        fromBank: {
          id: result.transferTransaction.transferFromBankId,
          name: (result.transferTransaction as any).transferFromBank?.name,
          accountNumber: (result.transferTransaction as any).transferFromBank?.accountNumber,
        },
        toBank: {
          id: result.transferTransaction.transferToBankId,
          name: (result.transferTransaction as any).transferToBank?.name,
          accountNumber: (result.transferTransaction as any).transferToBank?.accountNumber,
        },
        transactionDate: result.transferTransaction.transactionDate,
        transaction: result.transferTransaction,
      },
    };
  }

  @Get(':id')
  async findTransfer(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ) {
    const result = await this.bankTransactionService.findTransfer(id, user.id);
    
    return {
      transfer: {
        id: result.transferTransaction.id,
        amount: result.transferTransaction.amount,
        fromBank: {
          id: result.transferTransaction.transferFromBankId,
          name: (result.transferTransaction as any).transferFromBank?.name,
          accountNumber: (result.transferTransaction as any).transferFromBank?.accountNumber,
        },
        toBank: {
          id: result.transferTransaction.transferToBankId,
          name: (result.transferTransaction as any).transferToBank?.name,
          accountNumber: (result.transferTransaction as any).transferToBank?.accountNumber,
        },
        transactionDate: result.transferTransaction.transactionDate,
        transaction: result.transferTransaction,
      },
    };
  }

  @Patch(':id')
  async updateTransfer(
    @Param('id') id: string,
    @Body() updateTransferDto: UpdateTransferDto,
    @CurrentUser() user: User,
  ) {
    const result = await this.bankTransactionService.updateTransfer(id, updateTransferDto, user.id);
    
    return {
      message: 'Transferência atualizada com sucesso',
      transfer: {
        id: result.transferTransaction.id,
        amount: result.transferTransaction.amount,
        fromBank: {
          id: result.transferTransaction.transferFromBankId,
          name: (result.transferTransaction as any).transferFromBank?.name,
          accountNumber: (result.transferTransaction as any).transferFromBank?.accountNumber,
        },
        toBank: {
          id: result.transferTransaction.transferToBankId,
          name: (result.transferTransaction as any).transferToBank?.name,
          accountNumber: (result.transferTransaction as any).transferToBank?.accountNumber,
        },
        transactionDate: result.transferTransaction.transactionDate,
        transaction: result.transferTransaction,
      },
    };
  }

  @Delete(':id')
  async deleteTransfer(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ) {
    await this.bankTransactionService.deleteTransfer(id, user.id);
    
    return {
      message: 'Transferência excluída com sucesso',
    };
  }
}