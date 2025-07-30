import { Module } from '@nestjs/common';
import { BancosService } from './bancos.service';
import { BancosController } from './bancos.controller';
import { ConfigModule } from '../../config/config.module';
import { BankTransactionController } from './bank-transaction.controller';
import { BankTransactionService } from './bank-transaction.service';
import { OfxImportController } from './ofx-import.controller';
import { OfxImportService } from './ofx-import.service';
import { AiCategorizationController } from './ai-categorization.controller';
import { AiCategorizationService } from './ai-categorization.service';
import { PaymentMethodSuggestionController } from './payment-method-suggestion.controller';
import { PaymentMethodSuggestionService } from './payment-method-suggestion.service';
import { OfxPendingTransactionController } from './ofx-pending-transaction.controller';
import { OfxPendingTransactionService } from './ofx-pending-transaction.service';
import { TransferController } from './transfer.controller';
import { ConvertTransactionController } from './convert-transaction.controller';
import { PrismaService } from '../../config/prisma.service';
import { TagsModule } from '../tags/tags.module';

@Module({
  imports: [ConfigModule, TagsModule],
  controllers: [
    BancosController,
    BankTransactionController,
    OfxImportController,
    AiCategorizationController,
    PaymentMethodSuggestionController,
    OfxPendingTransactionController,
    TransferController,
    ConvertTransactionController,
  ],
  providers: [
    BancosService,
    BankTransactionService,
    OfxImportService,
    AiCategorizationService,
    PaymentMethodSuggestionService,
    OfxPendingTransactionService,
    PrismaService,
  ],
})
export class BancosModule {} 