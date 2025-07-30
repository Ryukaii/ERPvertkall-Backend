import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class ImportOfxDto {
  @IsString()
  @IsNotEmpty()
  fileName: string;

  @IsString()
  @IsNotEmpty()
  bankId: string;

  @IsOptional()
  @IsString()
  description?: string;
} 