import { Controller, Post, Body, UseGuards, Param } from '@nestjs/common';
import { PaymentMethodSuggestionService } from './payment-method-suggestion.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { FinancialTransactionType } from '@prisma/client';

@Controller('payment-method-suggestion')
@UseGuards(JwtAuthGuard)
export class PaymentMethodSuggestionController {
  constructor(
    private readonly paymentMethodSuggestionService: PaymentMethodSuggestionService,
  ) {}

  @Post('suggest')
  async suggestPaymentMethod(
    @Body() data: {
      transactionTitle: string;
      transactionDescription: string;
      amount: number;
      type: FinancialTransactionType;
    },
  ) {
    const suggestion = await this.paymentMethodSuggestionService.suggestPaymentMethodForTransaction(
      data.transactionTitle,
      data.transactionDescription,
      data.amount,
      data.type,
    );

    return {
      success: !!suggestion,
      suggestion,
    };
  }

  @Post('ofx-transaction/:id/suggest')
  async suggestPaymentMethodForOfxTransaction(@Param('id') id: string) {
    const suggestion = await this.paymentMethodSuggestionService.suggestPaymentMethodForOfxTransaction(id);

    return {
      success: !!suggestion,
      suggestion,
    };
  }
} 