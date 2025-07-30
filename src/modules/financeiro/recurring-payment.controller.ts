import { Controller, Post, Get, Body, Query, UseGuards, Param, Patch, Delete } from '@nestjs/common';
import { RecurringPaymentService } from './recurring-payment.service';
import { CreateRecurringPaymentDto } from './dto/create-recurring-payment.dto';
import { UpdateRecurringPaymentDto } from './dto/update-recurring-payment.dto';
import { FilterRecurringPaymentDto } from './dto/filter-recurring-payment.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ModuleAccessGuard } from '../../common/guards/module-access.guard';
import { PermissionGuard } from '../../common/guards/permission.guard';
import { RequireModule } from '../../common/decorators/module.decorator';
import { Permission } from '../../common/decorators/permission.decorator';

@Controller('financeiro/recurring-payments')
@UseGuards(JwtAuthGuard, ModuleAccessGuard, PermissionGuard)
@RequireModule('financeiro')
export class RecurringPaymentController {
  constructor(private readonly recurringPaymentService: RecurringPaymentService) {}

  @Post()
  @Permission('financeiro', 'recurring_payments', 'write')
  create(@Body() dto: CreateRecurringPaymentDto) {
    return this.recurringPaymentService.create(dto);
  }

  @Get()
  @Permission('financeiro', 'recurring_payments', 'read')
  findAll(@Query() filterDto: FilterRecurringPaymentDto) {
    return this.recurringPaymentService.findAll(filterDto);
  }

  @Get(':id')
  @Permission('financeiro', 'recurring_payments', 'read')
  findOne(@Param('id') id: string) {
    return this.recurringPaymentService.findOne(id);
  }

  @Patch(':id')
  @Permission('financeiro', 'recurring_payments', 'write')
  update(@Param('id') id: string, @Body() dto: UpdateRecurringPaymentDto) {
    return this.recurringPaymentService.update(id, dto);
  }

  @Delete(':id')
  @Permission('financeiro', 'recurring_payments', 'delete')
  remove(@Param('id') id: string) {
    return this.recurringPaymentService.remove(id);
  }
} 