import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { TagsService } from './tags.service';
import { CreateTagDto } from './dto/create-tag.dto';
import { UpdateTagDto } from './dto/update-tag.dto';
import { FilterTagDto } from './dto/filter-tag.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ModuleAccessGuard } from '../../common/guards/module-access.guard';
import { PermissionGuard } from '../../common/guards/permission.guard';
import { RequireModule } from '../../common/decorators/module.decorator';
import { Permission } from '../../common/decorators/permission.decorator';

@ApiTags('Tags')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, ModuleAccessGuard, PermissionGuard)
@RequireModule('tags')
@Controller('tags')
export class TagsController {
  constructor(private readonly tagsService: TagsService) {}

  @Post()
  @Permission('tags', 'tags', 'write')
  @ApiOperation({ summary: 'Criar nova tag' })
  @ApiResponse({ status: 201, description: 'Tag criada com sucesso.' })
  @ApiResponse({ status: 409, description: 'Tag com esse nome já existe.' })
  create(@Body() createTagDto: CreateTagDto) {
    return this.tagsService.create(createTagDto);
  }

  @Get()
  @Permission('tags', 'tags', 'read')
  @ApiOperation({ summary: 'Listar tags com filtros e paginação' })
  @ApiQuery({ name: 'name', required: false, description: 'Filtrar por nome' })
  @ApiQuery({ name: 'isActive', required: false, description: 'Filtrar por status ativo' })
  @ApiQuery({ name: 'page', required: false, description: 'Página (padrão: 1)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Itens por página (padrão: 10)' })
  @ApiResponse({ status: 200, description: 'Lista de tags retornada com sucesso.' })
  findAll(@Query() filterDto: FilterTagDto) {
    return this.tagsService.findAll(filterDto);
  }

  @Get('most-used')
  @Permission('tags', 'tags', 'read')
  @ApiOperation({ summary: 'Listar tags mais usadas' })
  @ApiQuery({ name: 'limit', required: false, description: 'Número máximo de tags (padrão: 10)' })
  @ApiResponse({ status: 200, description: 'Tags mais usadas retornadas com sucesso.' })
  findMostUsed(@Query('limit') limit?: string) {
    const limitNumber = limit ? parseInt(limit) : 10;
    return this.tagsService.findMostUsed(limitNumber);
  }

  @Get(':id')
  @Permission('tags', 'tags', 'read')
  @ApiOperation({ summary: 'Buscar tag por ID' })
  @ApiResponse({ status: 200, description: 'Tag encontrada com sucesso.' })
  @ApiResponse({ status: 404, description: 'Tag não encontrada.' })
  findOne(@Param('id') id: string) {
    return this.tagsService.findOne(id);
  }

  @Patch(':id')
  @Permission('tags', 'tags', 'write')
  @ApiOperation({ summary: 'Atualizar tag' })
  @ApiResponse({ status: 200, description: 'Tag atualizada com sucesso.' })
  @ApiResponse({ status: 404, description: 'Tag não encontrada.' })
  @ApiResponse({ status: 409, description: 'Tag com esse nome já existe.' })
  update(@Param('id') id: string, @Body() updateTagDto: UpdateTagDto) {
    return this.tagsService.update(id, updateTagDto);
  }

  @Patch(':id/toggle-active')
  @Permission('tags', 'tags', 'write')
  @ApiOperation({ summary: 'Ativar/desativar tag' })
  @ApiResponse({ status: 200, description: 'Status da tag alterado com sucesso.' })
  @ApiResponse({ status: 404, description: 'Tag não encontrada.' })
  toggleActive(@Param('id') id: string) {
    return this.tagsService.toggleActive(id);
  }

  @Delete(':id')
  @Permission('tags', 'tags', 'write')
  @ApiOperation({ summary: 'Excluir tag' })
  @ApiResponse({ status: 200, description: 'Tag excluída com sucesso.' })
  @ApiResponse({ status: 404, description: 'Tag não encontrada.' })
  @ApiResponse({ status: 409, description: 'Tag está sendo usada e não pode ser excluída.' })
  remove(@Param('id') id: string) {
    return this.tagsService.remove(id);
  }
}