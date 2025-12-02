import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import type { LecturersService } from './lecturers.service';
import {
  CreateLecturerBody,
  type UpdateLecturerBody,
  LecturerProfileRes,
} from './lecturers.schema';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiConflictResponse,
  ApiBearerAuth,
  ApiTags,
} from '@nestjs/swagger';
import { AuthRoles, UserRoleGuard } from 'src/auth/role.guard';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { UserRole } from '@prisma/client';
import type { UploadFileBody } from 'src/files/files.schema';
import { User } from 'src/auth/user.decorator';

@ApiTags('Lecturers', 'Admin')
@ApiBearerAuth('accessToken')
@Controller('lecturers')
@AuthRoles([UserRole.ADMIN])
@UseGuards(JwtAuthGuard, UserRoleGuard)
export class LecturersController {
  constructor(private readonly lecturersService: LecturersService) {}

  @ApiOperation({ summary: 'Create a new lecturer' })
  @ApiBody({ type: CreateLecturerBody })
  @ApiCreatedResponse({ description: 'Lecturer created successfully' })
  @ApiBadRequestResponse({ description: 'Invalid request body' })
  @ApiConflictResponse({ description: 'Lecturer already exists.' })
  @Post()
  async createLecturer(@Body() body: CreateLecturerBody) {
    return await this.lecturersService.createLecturer(body);
  }

  @Post('batch')
  async uploadFileForLecturers(
    @User('sub') userId: string,
    @Body() body: UploadFileBody,
  ) {
    return await this.lecturersService.uploadFileForLecturers(userId, body);
  }

  @ApiOperation({ summary: 'Get all lecturers' })
  @ApiOkResponse({ type: [LecturerProfileRes] })
  @Get()
  async getLecturers() {
    return await this.lecturersService.getLecturers();
  }

  @ApiOperation({ summary: 'Update a lecturer' })
  @ApiOkResponse({ description: 'Lecturer updated successfully' })
  @ApiConflictResponse({ description: 'Lecturer data already exists' })
  @ApiNotFoundResponse({ description: 'Lecturer not found' })
  @Patch(':lecturerId')
  async updateLecturer(
    @Param('lecturerId', ParseUUIDPipe) lecturerId: string,
    @Body() body: UpdateLecturerBody,
  ) {
    return await this.lecturersService.updateLecturer(lecturerId, body);
  }

  @ApiOperation({ summary: 'Delete a lecturer' })
  @ApiOkResponse({ description: 'Lecturer deleted successfully' })
  @ApiNotFoundResponse({ description: 'Lecturer not found' })
  @Delete(':lecturerId')
  async deleteLecturer(@Param('lecturerId', ParseUUIDPipe) lecturerId: string) {
    return await this.lecturersService.deleteLecturer(lecturerId);
  }
}
