import { IsString, IsOptional, IsBoolean, MinLength, MaxLength, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTagDto {
  @ApiProperty({ description: 'Nome da tag', example: 'Alimentação' })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  name: string;

  @ApiPropertyOptional({ 
    description: 'Cor da tag em hexadecimal', 
    example: '#FF5733' 
  })
  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-F]{6}$/i, { message: 'Cor deve estar no formato hexadecimal (#RRGGBB)' })
  color?: string;

  @ApiPropertyOptional({ 
    description: 'Descrição da tag', 
    example: 'Tags para despesas de alimentação' 
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;

  @ApiPropertyOptional({ 
    description: 'Se a tag está ativa', 
    example: true,
    default: true 
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;
}