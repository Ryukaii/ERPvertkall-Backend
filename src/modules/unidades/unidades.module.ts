import { Module } from '@nestjs/common';
import { UnidadesController } from './unidades.controller';
import { UnidadesService } from './unidades.service';
import { PrismaService } from '../../config/prisma.service';

@Module({
  controllers: [UnidadesController],
  providers: [UnidadesService, PrismaService],
  exports: [UnidadesService],
})
export class UnidadesModule {} 