import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { FinanceiroModule } from './modules/financeiro/financeiro.module';
import { UsersModule } from './modules/users/users.module';
import { BancosModule } from './modules/bancos/bancos.module';
import { PrismaService } from './config/prisma.service';
import { ConfigService } from './config/config.service';
import { UnidadesModule } from './modules/unidades/unidades.module';
import { TagsModule } from './modules/tags/tags.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { CacheService } from './common/services/cache.service';

@Module({
  imports: [AuthModule, FinanceiroModule, UsersModule, BancosModule, UnidadesModule, TagsModule, DashboardModule],
  controllers: [AppController],
  providers: [AppService, PrismaService, ConfigService, CacheService],
  exports: [CacheService], // Exportar para uso em outros módulos
})
export class AppModule {}
