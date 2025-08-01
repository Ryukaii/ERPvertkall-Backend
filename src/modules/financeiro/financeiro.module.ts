import { Module } from '@nestjs/common';
import { FinancialCategoryService } from './financial-category.service';
import { PaymentMethodService } from './payment-method.service';
import { FinancialTransactionService } from './financial-transaction.service';
import { FinancialCategoryController } from './financial-category.controller';
import { PaymentMethodController } from './payment-method.controller';
import { FinancialTransactionController } from './financial-transaction.controller';
import { RecurringPaymentService } from './recurring-payment.service';
import { RecurringPaymentController } from './recurring-payment.controller';
import { PrismaService } from '../../config/prisma.service';
import { RedisCacheService } from '../../common/services/redis-cache.service';
import { TagsModule } from '../tags/tags.module';

@Module({
  imports: [TagsModule],
  controllers: [
    FinancialCategoryController,
    PaymentMethodController,
    FinancialTransactionController,
    RecurringPaymentController,
  ],
  providers: [
    FinancialCategoryService,
    PaymentMethodService,
    FinancialTransactionService,
    PrismaService,
    RedisCacheService,
    RecurringPaymentService,
  ],
  exports: [
    FinancialCategoryService,
    PaymentMethodService,
    FinancialTransactionService,
    RecurringPaymentService,
  ],
})
export class FinanceiroModule {} 