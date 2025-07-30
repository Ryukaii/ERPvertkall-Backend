import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateUserPermissionsDto } from './dto/update-user-permissions.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AdminGuard } from '../../common/guards/admin.guard';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @UseGuards(AdminGuard)
  async findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  @UseGuards(AdminGuard)
  async findById(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  @Post(':id/toggle-admin')
  @UseGuards(AdminGuard)
  async toggleAdminStatus(@Param('id') id: string, @Request() req) {
    return this.usersService.toggleAdminStatus(id, req.user.sub);
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
      req.user.sub,
    );
  }

  @Get(':id/permissions')
  @UseGuards(AdminGuard)
  async getUserPermissions(@Param('id') id: string) {
    return this.usersService.getUserPermissions(id);
  }

  @Get('me/permissions')
  async getMyPermissions(@Request() req) {
    return this.usersService.getUserPermissions(req.user.sub);
  }
} 