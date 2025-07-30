import { IsArray, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateOfxPendingTagsDto {
  @ApiPropertyOptional({ 
    description: 'IDs das tags para adicionar/sobrescrever', 
    example: ['tag_123', 'tag_456'],
    type: [String]
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tagIds?: string[];
}