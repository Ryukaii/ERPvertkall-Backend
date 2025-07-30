import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class ModuleAccessGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    console.log('🚀 ModuleAccessGuard: STARTING canActivate method');
    const requiredModule = this.reflector.getAllAndOverride<string>('module', [
      context.getHandler(),
      context.getClass(),
    ]);
    console.log('🔍 ModuleAccessGuard: Required module:', requiredModule);
    
    if (!requiredModule) {
      return false; // Se não há módulo específico requerido, nega acesso por segurança
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Acesso negado');
    }

    // Se o usuário é admin, tem acesso a todos os módulos
    console.log('🔍 ModuleAccessGuard DEBUG:', {
      userId: user.id,
      userEmail: user.email,
      isAdmin: user.isAdmin,
      userKeys: Object.keys(user),
      requiredModule
    });
    
    if (user.isAdmin) {
      console.log('✅ ModuleAccessGuard: User is admin, granting access');
      return true;
    }
    
    console.log('⚠️ ModuleAccessGuard: User is NOT admin, checking module permissions...');

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