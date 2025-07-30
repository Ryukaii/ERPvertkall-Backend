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
    const permission = this.reflector.get<{ module: string; resource: string; action: string }>(
      PERMISSION_KEY,
      context.getHandler(),
    );
    
    if (!permission) {
      return true; // Se não há permissão específica requerida, permite acesso
    }

    const { module: requiredModule, resource: requiredResource, action: requiredAction } = permission;

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Usuário não autenticado');
    }

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