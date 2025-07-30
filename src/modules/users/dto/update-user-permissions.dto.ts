import { IsString, IsArray, ValidateNested, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

export class PermissionDto {
  @IsString()
  resource: string;

  @IsString()
  action: string;

  @IsBoolean()
  isActive: boolean;
}

export class UpdateUserPermissionsDto {
  @IsString()
  moduleId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PermissionDto)
  permissions: PermissionDto[];
} 