import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  ParseFilePipeBuilder,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
} from '@nestjs/common';
import { CoursesService } from './courses.service';
import {
  CourseRes,
  CreateCourseBody,
  UpdateCourseBody,
} from './courses.schema';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { AuthRoles, UserRoleGuard } from 'src/auth/role.guard';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { UserRole } from '@prisma/client';
import { User } from 'src/auth/user.decorator';

@ApiTags('Courses', 'Admin')
@ApiBearerAuth('accessToken')
@Controller('courses')
@AuthRoles([UserRole.ADMIN])
@UseGuards(JwtAuthGuard, UserRoleGuard)
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  @ApiOperation({ summary: 'Create a new course' })
  @ApiBody({ type: CreateCourseBody })
  @ApiCreatedResponse({ description: 'Course created successfully' })
  @ApiBadRequestResponse({ description: 'Invalid course creation data' })
  @ApiConflictResponse({ description: 'Course already exists' })
  @Post()
  async createCourse(@Body() body: CreateCourseBody) {
    return await this.coursesService.createCourse(body);
  }

  @ApiOperation({ summary: 'Create multiple courses from a file' })
  @Post('batch')
  async uploadFileForCourses(
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
    return await this.coursesService.uploadFileForCourses(userId, file);
  }

  @ApiOperation({ summary: 'Get all courses' })
  @ApiOkResponse({ type: [CourseRes] })
  @Get()
  async getCourses() {
    return await this.coursesService.getCourses();
  }

  @ApiOperation({ summary: 'Get a course by ID' })
  @ApiOkResponse({ type: CourseRes })
  @ApiNotFoundResponse({ description: 'Course not found' })
  @Get(':courseId')
  async getCourse(@Param('courseId') courseId: string) {
    return await this.coursesService.getCourse(courseId);
  }

  @ApiOperation({ summary: 'Update a course by ID' })
  @ApiBody({ type: UpdateCourseBody })
  @ApiParam({ name: 'courseId', description: 'ID of the course to update' })
  @ApiOkResponse({ description: 'Course updated successfully' })
  @ApiNotFoundResponse({ description: 'Course not found' })
  @ApiConflictResponse({ description: 'Course already exists' })
  @Patch(':courseId')
  async updateCourse(
    @Param('courseId') courseId: string,
    @Body() body: UpdateCourseBody,
  ) {
    return await this.coursesService.updateCourse(courseId, body);
  }

  @ApiOperation({ summary: 'Delete a course by ID' })
  @ApiParam({ name: 'courseId', description: 'ID of the course to delete' })
  @ApiOkResponse({ description: 'Course deleted successfully' })
  @ApiNotFoundResponse({ description: 'Course not found' })
  @Delete(':courseId')
  async deleteCourse(@Param('courseId') courseId: string) {
    return await this.coursesService.deleteCourse(courseId);
  }
}
