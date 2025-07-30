import { IsBoolean, IsOptional } from 'class-validator';

export class ApproveUserDto {
  @IsBoolean()
  @IsOptional()
  isApproved?: boolean;
} 