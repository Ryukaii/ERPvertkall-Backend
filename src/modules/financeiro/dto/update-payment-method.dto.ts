import { PartialType } from '@nestjs/mapped-types';
import { CreatePaymentMethodDto } from './create-payment-method.dto';

// 'name' is inherited from CreatePaymentMethodDto
export class UpdatePaymentMethodDto extends PartialType(CreatePaymentMethodDto) {} 