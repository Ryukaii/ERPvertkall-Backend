import { IsString, IsNotEmpty } from 'class-validator';

export class CreateUnidadeDto {
  @IsString()
  @IsNotEmpty()
  nome: string;

  @IsString()
  @IsNotEmpty()
  local: string;
} 