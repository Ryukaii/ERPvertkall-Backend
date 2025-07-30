import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service';
import { FilterUsersDto } from './dto/filter-users.dto';
import { ApproveUserDto } from './dto/approve-user.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAll(filterDto?: FilterUsersDto) {
    const where: any = {};
    
    if (filterDto?.isApproved !== undefined) {
      where.isApproved = filterDto.isApproved;
    }
    
    if (filterDto?.isAdmin !== undefined) {
      where.isAdmin = filterDto.isAdmin;
    }

    return this.prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        name: true,
        isAdmin: true,
        isApproved: true,
        createdAt: true,
        userPermissions: {
          include: {
            module: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
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
        isApproved: true,
        createdAt: true,
      },
    });
  }

  async approveUser(userId: string, approveUserDto: ApproveUserDto, currentUserId: string) {
    // Verificar se o usuário atual é admin ou tem permissão de aprovação
    const currentUser = await this.prisma.user.findUnique({
      where: { id: currentUserId },
    });

    if (!currentUser?.isAdmin) {
      // Verificar se tem permissão específica para aprovar usuários
      const hasApprovalPermission = await this.checkPermission(
        currentUserId,
        'users',
        'user_approval',
        'write'
      );

      if (!hasApprovalPermission) {
        throw new ForbiddenException('Apenas administradores ou usuários com permissão de aprovação podem aprovar usuários');
      }
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    const isApproved = approveUserDto.isApproved !== undefined ? approveUserDto.isApproved : true;

    // Se está aprovando o usuário, criar permissões padrão
    if (isApproved && !user.isApproved) {
      await this.createDefaultPermissions(userId);
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: { isApproved },
      select: {
        id: true,
        email: true,
        name: true,
        isAdmin: true,
        isApproved: true,
        createdAt: true,
      },
    });
  }

  private async createDefaultPermissions(userId: string) {
    try {
      // Criar permissões padrão para o módulo financeiro
      const financialModule = await this.prisma.module.findFirst({
        where: { name: 'financeiro' },
      });

      if (!financialModule) {
        console.warn('Módulo financeiro não encontrado. Permissões padrão não foram criadas.');
        return;
      }

      // Definir permissões básicas para o módulo financeiro
      const defaultPermissions = [
        { resource: 'financial_transactions', action: 'read' },
        { resource: 'financial_categories', action: 'read' },
        { resource: 'payment_methods', action: 'read' },
      ];

      // Usar upsert para evitar conflitos de constraint única
      await Promise.all(
        defaultPermissions.map(permission =>
          this.prisma.userPermission.upsert({
            where: {
              userId_moduleId_resource_action: {
                userId,
                moduleId: financialModule.id,
                resource: permission.resource,
                action: permission.action,
              },
            },
            update: {
              isActive: true, // Reativar se já existir mas estiver inativo
            },
            create: {
              userId,
              moduleId: financialModule.id,
              resource: permission.resource,
              action: permission.action,
              isActive: true,
            },
          })
        )
      );

      console.log(`Permissões padrão criadas/atualizadas para usuário ${userId}`);
    } catch (error) {
      console.error('Erro ao criar permissões padrão:', error);
      throw new Error('Falha ao criar permissões padrão para o usuário');
    }
  }

  async getPendingApprovals() {
    return this.prisma.user.findMany({
      where: { isApproved: false },
      select: {
        id: true,
        email: true,
        name: true,
        isAdmin: true,
        isApproved: true,
        createdAt: true,
        userPermissions: {
          include: {
            module: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
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

  async getAvailableModules() {
    return this.prisma.module.findMany({
      where: { isActive: true },
      orderBy: { displayName: 'asc' },
      select: {
        id: true,
        name: true,
        displayName: true,
        description: true,
        isActive: true,
        _count: {
          select: {
            userPermissions: true,
          },
        },
      },
    });
  }

  async getModuleResources(moduleId: string) {
    // Verificar se o módulo existe
    const module = await this.prisma.module.findUnique({
      where: { id: moduleId },
    });

    if (!module) {
      throw new NotFoundException('Módulo não encontrado');
    }

    // Buscar recursos únicos do módulo
    const permissions = await this.prisma.userPermission.findMany({
      where: { moduleId },
      select: {
        resource: true,
        action: true,
      },
      distinct: ['resource', 'action'],
      orderBy: [
        { resource: 'asc' },
        { action: 'asc' },
      ],
    });

    // Agrupar por recurso
    const resourcesMap = new Map();
    
    permissions.forEach(permission => {
      if (!resourcesMap.has(permission.resource)) {
        resourcesMap.set(permission.resource, {
          resource: permission.resource,
          actions: [],
        });
      }
      resourcesMap.get(permission.resource).actions.push(permission.action);
    });

    return {
      module: {
        id: module.id,
        name: module.name,
        displayName: module.displayName,
        description: module.description,
      },
      resources: Array.from(resourcesMap.values()),
    };
  }

  async removeUserPermission(
    userId: string,
    moduleId: string,
    resource: string,
    action: string,
    currentUserId: string,
  ) {
    // Verificar se o usuário atual é admin
    const currentUser = await this.prisma.user.findUnique({
      where: { id: currentUserId },
    });

    if (!currentUser?.isAdmin) {
      throw new ForbiddenException('Apenas administradores podem remover permissões');
    }

    // Verificar se a permissão existe
    const permission = await this.prisma.userPermission.findUnique({
      where: {
        userId_moduleId_resource_action: {
          userId,
          moduleId,
          resource,
          action,
        },
      },
      include: {
        user: { select: { name: true, email: true } },
        module: { select: { name: true, displayName: true } },
      },
    });

    if (!permission) {
      throw new NotFoundException('Permissão não encontrada');
    }

    // Remover a permissão
    await this.prisma.userPermission.delete({
      where: {
        userId_moduleId_resource_action: {
          userId,
          moduleId,
          resource,
          action,
        },
      },
    });

    return {
      message: `Permissão ${permission.module.name}:${resource}:${action} removida do usuário ${permission.user.name}`,
      removedPermission: {
        module: permission.module.displayName,
        resource,
        action,
        user: permission.user.name,
      },
    };
  }

  async getAllAvailablePermissions() {
    // Buscar todos os módulos ativos
    const modules = await this.prisma.module.findMany({
      where: { isActive: true },
      orderBy: { displayName: 'asc' },
    });

    // Buscar todas as permissões únicas do sistema
    const allPermissions = await this.prisma.userPermission.findMany({
      select: {
        moduleId: true,
        resource: true,
        action: true,
        module: {
          select: {
            id: true,
            name: true,
            displayName: true,
            description: true,
          },
        },
      },
      distinct: ['moduleId', 'resource', 'action'],
      orderBy: [
        { module: { displayName: 'asc' } },
        { resource: 'asc' },
        { action: 'asc' },
      ],
    });

    // Agrupar permissões por módulo
    const permissionsByModule = new Map();

    // Inicializar todos os módulos ativos
    modules.forEach(module => {
      permissionsByModule.set(module.id, {
        module: {
          id: module.id,
          name: module.name,
          displayName: module.displayName,
          description: module.description,
        },
        resources: new Map(),
      });
    });

    // Processar permissões encontradas
    allPermissions.forEach(permission => {
      const moduleData = permissionsByModule.get(permission.moduleId);
      if (moduleData) {
        const resourceMap = moduleData.resources;
        
        if (!resourceMap.has(permission.resource)) {
          resourceMap.set(permission.resource, {
            resource: permission.resource,
            actions: [],
          });
        }
        
        resourceMap.get(permission.resource).actions.push(permission.action);
      }
    });

    // Converter para formato final
    const result = Array.from(permissionsByModule.values()).map(moduleData => ({
      module: moduleData.module,
      resources: Array.from(moduleData.resources.values()),
    }));

    return result;
  }
} 