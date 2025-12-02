import { Body, Controller, Get, Patch, Post, UseGuards } from '@nestjs/common';
import type { AdminService } from './admin.service';
import { User } from 'src/auth/user.decorator';
import { type AddAdminBody, AdminProfileRes, type UpdateAdminBody } from './admin.schema';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { AuthRoles, UserRoleGuard } from 'src/auth/role.guard';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import type { AdminData, UserPayload } from 'src/auth/auth.schema';

@ApiTags('Admin')
@ApiBearerAuth('accessToken')
@Controller('admin')
@AuthRoles([UserRole.ADMIN])
@UseGuards(JwtAuthGuard, UserRoleGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @ApiOperation({ summary: 'Invite an admin' })
  @ApiCreatedResponse({ description: 'Admin added successfully' })
  @ApiConflictResponse({ description: 'User already exists' })
  @Post()
  async addAdmin(@Body() body: AddAdminBody) {
    return await this.adminService.addAdmin(body);
  }

  @ApiOperation({ summary: 'Get list of admins' })
  @ApiOkResponse({ type: [AdminProfileRes] })
  @Get()
  async getAdmins() {
    return await this.adminService.getAdmins();
  }

  @ApiOperation({ summary: 'Get admin profile' })
  @ApiOkResponse({ type: AdminProfileRes })
  @Get('profile')
  async getProfile(@User('id') adminId: string) {
    return await this.adminService.getProfile(adminId);
  }

  @ApiOperation({ summary: 'Update admin profile' })
  @ApiOkResponse({ type: AdminProfileRes })
  @Patch('profile')
  async updateProfile(
    @User() user: UserPayload,
    @Body() body: UpdateAdminBody,
  ) {
    const { adminId } = user.userData as AdminData;
    return await this.adminService.updateProfile(adminId, body);
  }
}
