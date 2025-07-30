import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Patch, 
  Param, 
  Delete, 
  UseGuards, 
  Query,
  UseInterceptors
} from '@nestjs/common';
import { FinancialCategoryService } from './financial-category.service';
import { CreateFinancialCategoryDto } from './dto/create-financial-category.dto';
import { UpdateFinancialCategoryDto } from './dto/update-financial-category.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ModuleAccessGuard } from '../../common/guards/module-access.guard';
import { PermissionGuard } from '../../common/guards/permission.guard';
import { RequireModule } from '../../common/decorators/module.decorator';
import { Permission } from '../../common/decorators/permission.decorator';
import { FinancialTransactionType } from '@prisma/client';
import { DateTransformerInterceptor } from '../../common/interceptors/date-transformer.interceptor';

@Controller('financeiro/categories')
@UseGuards(JwtAuthGuard, ModuleAccessGuard, PermissionGuard)
@RequireModule('financeiro')
@UseInterceptors(DateTransformerInterceptor)
export class FinancialCategoryController {
  constructor(private readonly financialCategoryService: FinancialCategoryService) {}

  @Post()
  @Permission('financeiro', 'categories', 'write')
  create(@Body() createFinancialCategoryDto: CreateFinancialCategoryDto) {
    return this.financialCategoryService.create(createFinancialCategoryDto);
  }

  @Get()
  @Permission('financeiro', 'categories', 'read')
  findAll(@Query('type') type?: FinancialTransactionType) {
    return this.financialCategoryService.findAll(type);
  }

  @Get(':id')
  @Permission('financeiro', 'categories', 'read')
  findOne(@Param('id') id: string) {
    return this.financialCategoryService.findOne(id);
  }

  @Patch(':id')
  @Permission('financeiro', 'categories', 'write')
  update(
    @Param('id') id: string, 
    @Body() updateFinancialCategoryDto: UpdateFinancialCategoryDto
  ) {
    return this.financialCategoryService.update(id, updateFinancialCategoryDto);
  }

  @Delete(':id')
  @Permission('financeiro', 'categories', 'write')
  remove(@Param('id') id: string) {
    return this.financialCategoryService.remove(id);
  }
} 