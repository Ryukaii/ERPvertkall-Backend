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
import { OfxPendingTransactionController } from './ofx-pending-transaction.controller';
import { OfxPendingTransactionService } from './ofx-pending-transaction.service';
import { PrismaService } from '../../config/prisma.service';

@Module({
  imports: [ConfigModule],
  controllers: [
    BancosController,
    BankTransactionController,
    OfxImportController,
    AiCategorizationController,
    OfxPendingTransactionController,
  ],
  providers: [
    BancosService,
    BankTransactionService,
    OfxImportService,
    AiCategorizationService,
    OfxPendingTransactionService,
    PrismaService,
  ],
})
export class BancosModule {} 