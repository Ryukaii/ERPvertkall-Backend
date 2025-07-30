import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        isAdmin: true,
        createdAt: true,
        userPermissions: {
          include: {
            module: true,
          },
        },
      },
    });
  }

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        userPermissions: {
          include: {
            module: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async toggleAdminStatus(userId: string, currentUserId: string) {
    // Verificar se o usuário atual é admin
    const currentUser = await this.prisma.user.findUnique({
      where: { id: currentUserId },
    });

    if (!currentUser?.isAdmin) {
      throw new ForbiddenException('Apenas administradores podem alterar status de admin');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: { isAdmin: !user.isAdmin },
      select: {
        id: true,
        email: true,
        name: true,
        isAdmin: true,
        createdAt: true,
      },
    });
  }

  async updateUserPermissions(
    userId: string,
    moduleId: string,
    permissions: Array<{ resource: string; action: string; isActive: boolean }>,
    currentUserId: string,
  ) {
    // Verificar se o usuário atual é admin
    const currentUser = await this.prisma.user.findUnique({
      where: { id: currentUserId },
    });

    if (!currentUser?.isAdmin) {
      throw new ForbiddenException('Apenas administradores podem alterar permissões');
    }

    // Verificar se o usuário existe
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    // Verificar se o módulo existe
    const module = await this.prisma.module.findUnique({
      where: { id: moduleId },
    });

    if (!module) {
      throw new NotFoundException('Módulo não encontrado');
    }

    // Atualizar permissões
    const updatedPermissions = await Promise.all(
      permissions.map(async (permission) => {
        return this.prisma.userPermission.upsert({
          where: {
            userId_moduleId_resource_action: {
              userId,
              moduleId,
              resource: permission.resource,
              action: permission.action,
            },
          },
          update: {
            isActive: permission.isActive,
          },
          create: {
            userId,
            moduleId,
            resource: permission.resource,
            action: permission.action,
            isActive: permission.isActive,
          },
        });
      }),
    );

    return updatedPermissions;
  }

  async getUserPermissions(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        userPermissions: {
          include: {
            module: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    return user.userPermissions;
  }

  async checkPermission(userId: string, moduleName: string, resource: string, action: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        userPermissions: {
          include: {
            module: true,
          },
        },
      },
    });

    if (!user) {
      return false;
    }

    // Se o usuário é admin, tem todas as permissões
    if (user.isAdmin) {
      return true;
    }

    // Verificar permissão específica
    const hasPermission = user.userPermissions.some(
      (permission) =>
        permission.module.name === moduleName &&
        permission.resource === resource &&
        permission.action === action &&
        permission.isActive,
    );

    return hasPermission;
  }
} 