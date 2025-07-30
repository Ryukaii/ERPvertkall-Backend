import { SetMetadata } from '@nestjs/common';

export const RequireModule = (module: string) => SetMetadata('module', module); 