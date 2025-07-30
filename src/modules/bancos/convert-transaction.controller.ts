import {
  Controller,
  Post,
  Body,
  UseGuards,
} from '@nestjs/common';
import { BankTransactionService } from './bank-transaction.service';
import { ConvertToTransferDto } from './dto/convert-to-transfer.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '@prisma/client';

@Controller('bancos/transactions/convert-to-transfer')
@UseGuards(JwtAuthGuard)
export class ConvertTransactionController {
  constructor(private readonly bankTransactionService: BankTransactionService) {}

  @Post()
  async convertToTransfer(
    @Body() convertDto: ConvertToTransferDto,
    @CurrentUser() user: User,
  ) {
    const result = await this.bankTransactionService.convertToTransfer(convertDto, user.id);
    
    return {
      message: 'Transação convertida em transferência com sucesso',
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
} 