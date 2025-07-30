import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Patch, 
  Param, 
  Delete, 
  UseGuards, 
  Query 
} from '@nestjs/common';
import { PaymentMethodService } from './payment-method.service';
import { CreatePaymentMethodDto } from './dto/create-payment-method.dto';
import { UpdatePaymentMethodDto } from './dto/update-payment-method.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ModuleAccessGuard } from '../../common/guards/module-access.guard';
import { PermissionGuard } from '../../common/guards/permission.guard';
import { RequireModule } from '../../common/decorators/module.decorator';
import { Permission } from '../../common/decorators/permission.decorator';

@Controller('financeiro/payment-methods')
@UseGuards(JwtAuthGuard, ModuleAccessGuard, PermissionGuard)
@RequireModule('financeiro')
export class PaymentMethodController {
  constructor(private readonly paymentMethodService: PaymentMethodService) {}

  @Post()
  @Permission('financeiro', 'payment_methods', 'write')
  create(@Body() createPaymentMethodDto: CreatePaymentMethodDto) {
    return this.paymentMethodService.create(createPaymentMethodDto);
  }

  @Get()
  @Permission('financeiro', 'payment_methods', 'read')
  findAll(@Query('includeInactive') includeInactive?: string) {
    return this.paymentMethodService.findAll(includeInactive === 'true');
  }

  @Get(':id')
  @Permission('financeiro', 'payment_methods', 'read')
  findOne(@Param('id') id: string) {
    return this.paymentMethodService.findOne(id);
  }

  @Patch(':id')
  @Permission('financeiro', 'payment_methods', 'write')
  update(
    @Param('id') id: string, 
    @Body() updatePaymentMethodDto: UpdatePaymentMethodDto
  ) {
    return this.paymentMethodService.update(id, updatePaymentMethodDto);
  }

  @Delete(':id')
  @Permission('financeiro', 'payment_methods', 'write')
  remove(@Param('id') id: string) {
    return this.paymentMethodService.remove(id);
  }
} 