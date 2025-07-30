import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { UnidadesService } from './unidades.service';
import { CreateUnidadeDto } from './dto/create-unidade.dto';
import { UpdateUnidadeDto } from './dto/update-unidade.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ModuleAccessGuard } from '../../common/guards/module-access.guard';
import { PermissionGuard } from '../../common/guards/permission.guard';
import { RequireModule } from '../../common/decorators/module.decorator';
import { Permission } from '../../common/decorators/permission.decorator';

@Controller('unidades')
@UseGuards(JwtAuthGuard, ModuleAccessGuard, PermissionGuard)
@RequireModule('unidades')
export class UnidadesController {
  constructor(private readonly unidadesService: UnidadesService) {}

  @Post()
  @Permission('unidades', 'unidades', 'write')
  create(@Body() dto: CreateUnidadeDto) {
    return this.unidadesService.create(dto);
  }

  @Get()
  @Permission('unidades', 'unidades', 'read')
  findAll() {
    return this.unidadesService.findAll();
  }

  @Get(':id')
  @Permission('unidades', 'unidades', 'read')
  findOne(@Param('id') id: string) {
    return this.unidadesService.findOne(id);
  }

  @Patch(':id')
  @Permission('unidades', 'unidades', 'write')
  update(@Param('id') id: string, @Body() dto: UpdateUnidadeDto) {
    return this.unidadesService.update(id, dto);
  }

  @Delete(':id')
  @Permission('unidades', 'unidades', 'write')
  remove(@Param('id') id: string) {
    return this.unidadesService.remove(id);
  }
} 