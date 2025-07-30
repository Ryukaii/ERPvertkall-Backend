import { SetMetadata } from '@nestjs/common';

export const PERMISSION_KEY = 'permission';
export const Permission = (module: string, resource: string, action: string) =>
  SetMetadata(PERMISSION_KEY, { module, resource, action }); 