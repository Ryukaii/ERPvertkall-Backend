import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../config/prisma.service';
import { PERMISSION_KEY } from '../decorators/permission.decorator';

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    console.log('🚀 PermissionGuard: STARTING canActivate method');
    const permission = this.reflector.getAllAndOverride<{ module: string; resource: string; action: string }>(
      PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );
    console.log('🔍 PermissionGuard: Required permission:', permission);
    
    if (!permission) {
      return false; // Se não há permissão específica requerida, nega acesso por segurança
    }

    const { module: requiredModule, resource: requiredResource, action: requiredAction } = permission;

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Usuário não autenticado');
    }

    // Se o usuário é admin, tem todas as permissões - verificar direto do objeto user
    console.log('🔍 PermissionGuard DEBUG:', {
      userId: user.id,
      userEmail: user.email,
      isAdmin: user.isAdmin,
      userKeys: Object.keys(user),
      requiredPermission: `${requiredModule}:${requiredResource}:${requiredAction}`
    });
    
    if (user.isAdmin) {
      console.log('✅ PermissionGuard: User is admin, granting access');
      return true;
    }
    
    console.log('⚠️ PermissionGuard: User is NOT admin, checking specific permissions...');

    const dbUser = await this.prisma.user.findUnique({
      where: { id: user.id },
      include: {
        userPermissions: {
          include: {
            module: true,
          },
        },
      },
    });

    if (!dbUser) {
      throw new ForbiddenException('Usuário não encontrado');
    }

    // Se o usuário é admin, tem todas as permissões
    if (dbUser.isAdmin) {
      return true;
    }

    // Verificar permissão específica
    const hasPermission = dbUser.userPermissions.some(
      (permission) =>
        permission.module.name === requiredModule &&
        permission.resource === requiredResource &&
        permission.action === requiredAction &&
        permission.isActive,
    );

    if (!hasPermission) {
      throw new ForbiddenException(
        `Acesso negado. Permissão necessária: ${requiredModule}:${requiredResource}:${requiredAction}`,
      );
    }

    return true;
  }
} 