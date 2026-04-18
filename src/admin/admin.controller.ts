import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { User } from 'src/auth/user.decorator';
import {
  ActivateFixtureLecturersBody,
  AddAdminBody,
  UpdateAdminBody,
  UpdateLecturerDesignationDto,
} from './admin.dto';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { AuthRoles, UserRoleGuard } from 'src/auth/role.guard';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { AdminData, type UserPayload } from 'src/auth/auth.dto';
import { AdminProfileRes } from './admin.responses';

@ApiTags('admin', 'Admin')
@ApiBearerAuth('accessToken')
@Controller('admin')
// @AuthRoles([UserRole.ADMIN])
// @UseGuards(JwtAuthGuard, UserRoleGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @ApiOperation({ summary: 'Invite an admin' })
  @ApiBody({ type: AddAdminBody })
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
  async getProfile(@User() user: UserPayload) {
    const { adminId } = user.userData as AdminData;
    return await this.adminService.getProfile(adminId);
  }

  @ApiOperation({ summary: 'Update admin profile' })
  @ApiBody({ type: UpdateAdminBody })
  @ApiOkResponse({ description: 'Admin profile updated successfully' })
  @Patch('profile')
  async updateProfile(
    @User() user: UserPayload,
    @Body() body: UpdateAdminBody,
  ) {
    const { adminId } = user.userData as AdminData;
    return await this.adminService.updateProfile(adminId, body);
  }

  @ApiOperation({
  summary: 'Update lecturer designation',
  description:
    'Assigns or updates a role for a lecturer. '
})
  @ApiParam({ name: 'lecturerId', description: 'ID of the lecturer to update' })
  @ApiBody({ type: UpdateLecturerDesignationDto })
  @ApiOkResponse({ description: 'Lecturer designation updated successfully' })
  @Patch('lecturers/:lecturerId/designation')
  async updateLecturerDesignation(
    @Param('lecturerId') lecturerId: string,
    @Body() body: UpdateLecturerDesignationDto,
  ) {
    return await this.adminService.updateLecturerDesignation(lecturerId, body);
  }

  @ApiOperation({ summary: 'Activate fixture lecturers with a shared test password' })
  @ApiBody({ type: ActivateFixtureLecturersBody })
  @ApiOkResponse({
    description: 'Fixture lecturers processed',
    schema: {
      type: 'object',
      properties: {
        activatedCount: { type: 'number' },
        skippedCount: { type: 'number' },
        notFoundEmails: { type: 'array', items: { type: 'string' } },
      },
    },
  })
  @Post('fixtures/activate-lecturers')
  async activateFixtureLecturers(@Body() body: ActivateFixtureLecturersBody) {
    return await this.adminService.activateFixtureLecturers(body);
  }
}
