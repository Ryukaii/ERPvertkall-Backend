import { Module } from '@nestjs/common';
import { TagsService } from './tags.service';
import { TagsController } from './tags.controller';
import { ConfigModule } from '../../config/config.module';
import { PrismaService } from '../../config/prisma.service';

@Module({
  imports: [ConfigModule],
  controllers: [TagsController],
  providers: [TagsService, PrismaService],
  exports: [TagsService], // Exportar para outros módulos usarem
})
export class TagsModule {}