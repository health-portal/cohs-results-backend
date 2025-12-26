import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  ParseFilePipeBuilder,
  ParseUUIDPipe,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
} from '@nestjs/common';
import { LecturersService } from './lecturers.service';
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
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addFileTypeValidator({
          fileType:
            /^(text\/csv|application\/vnd\.ms-excel|application\/vnd\.openxmlformats-officedocument\.spreadsheetml\.sheet)$/i,
          fallbackToMimetype: true,
        })
        .addMaxSizeValidator({
          maxSize: 1024 * 1024,
        })
        .build({
          errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        }),
    )
    file: Express.Multer.File,
  ) {
    return await this.lecturersService.uploadFileForLecturers(userId, file);
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
