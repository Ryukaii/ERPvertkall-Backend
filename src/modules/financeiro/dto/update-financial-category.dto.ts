import { PartialType } from '@nestjs/mapped-types';
import { CreateFinancialCategoryDto } from './create-financial-category.dto';

// 'name' is inherited from CreateFinancialCategoryDto
export class UpdateFinancialCategoryDto extends PartialType(CreateFinancialCategoryDto) {} 