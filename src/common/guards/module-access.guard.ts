import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class ModuleAccessGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredModule = this.reflector.get<string>('module', context.getHandler());
    
    if (!requiredModule) {
      return true; // Se não há módulo específico requerido, permite acesso
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Acesso negado');
    }

    // Se o usuário é admin, tem acesso a todos os módulos
    if (user.isAdmin) {
      return true;
    }

    // Verificar se o usuário tem alguma permissão ativa para o módulo
    const hasModuleAccess = user.userPermissions?.some(
      (permission: any) => 
        permission.module.name === requiredModule && 
        permission.isActive
    );

    if (!hasModuleAccess) {
      throw new ForbiddenException(`Acesso negado ao módulo: ${requiredModule}`);
    }

    return true;
  }
} 