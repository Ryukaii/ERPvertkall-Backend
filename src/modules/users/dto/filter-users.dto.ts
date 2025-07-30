import { IsOptional, IsBoolean } from 'class-validator';

export class FilterUsersDto {
  @IsOptional()
  @IsBoolean()
  isApproved?: boolean;

  @IsOptional()
  @IsBoolean()
  isAdmin?: boolean;
} 