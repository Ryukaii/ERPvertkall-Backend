import { IsString, IsOptional } from 'class-validator';

export class UpdateUnidadeDto {
  @IsString()
  @IsOptional()
  nome?: string;

  @IsString()
  @IsOptional()
  local?: string;
} 