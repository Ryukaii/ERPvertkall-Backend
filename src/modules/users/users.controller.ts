import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateUserPermissionsDto } from './dto/update-user-permissions.dto';
import { FilterUsersDto } from './dto/filter-users.dto';
import { ApproveUserDto } from './dto/approve-user.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AdminGuard } from '../../common/guards/admin.guard';
import { Permission } from '../../common/decorators/permission.decorator';
import { PermissionGuard } from '../../common/guards/permission.guard';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @UseGuards(AdminGuard)
  async findAll(@Query() filterDto: FilterUsersDto) {
    return this.usersService.findAll(filterDto);
  }

  @Get('pending-approvals')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permission('users', 'user_approval', 'read')
  async getPendingApprovals() {
    return this.usersService.getPendingApprovals();
  }

  @Get(':id')
  @UseGuards(AdminGuard)
  async findById(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  @Post(':id/toggle-admin')
  @UseGuards(AdminGuard)
  async toggleAdminStatus(@Param('id') id: string, @Request() req) {
    return this.usersService.toggleAdminStatus(id, req.user.id);
  }

  @Put(':id/approve')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permission('users', 'user_approval', 'write')
  async approveUser(
    @Param('id') id: string,
    @Body() approveUserDto: ApproveUserDto,
    @Request() req,
  ) {
    return this.usersService.approveUser(id, approveUserDto, req.user.id);
  }

  @Put(':id/permissions')
  @UseGuards(AdminGuard)
  async updateUserPermissions(
    @Param('id') id: string,
    @Body() updateUserPermissionsDto: UpdateUserPermissionsDto,
    @Request() req,
  ) {
    return this.usersService.updateUserPermissions(
      id,
      updateUserPermissionsDto.moduleId,
      updateUserPermissionsDto.permissions,
      req.user.id,
    );
  }

  @Get(':id/permissions')
  @UseGuards(AdminGuard)
  async getUserPermissions(@Param('id') id: string) {
    return this.usersService.getUserPermissions(id);
  }

  @Get('me/permissions')
  async getMyPermissions(@Request() req) {
    return this.usersService.getUserPermissions(req.user.id);
  }

  @Get('modules')
  @UseGuards(AdminGuard)
  async getAvailableModules() {
    return this.usersService.getAvailableModules();
  }

  @Get('modules/:moduleId/resources')
  @UseGuards(AdminGuard)
  async getModuleResources(@Param('moduleId') moduleId: string) {
    return this.usersService.getModuleResources(moduleId);
  }

  @Delete(':id/permissions/:moduleId/:resource/:action')
  @UseGuards(AdminGuard)
  async removeUserPermission(
    @Param('id') userId: string,
    @Param('moduleId') moduleId: string,
    @Param('resource') resource: string,
    @Param('action') action: string,
    @Request() req,
  ) {
    return this.usersService.removeUserPermission(
      userId,
      moduleId,
      resource,
      action,
      req.user.id,
    );
  }
} 