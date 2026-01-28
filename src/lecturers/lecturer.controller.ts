import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseFilePipeBuilder,
  ParseUUIDPipe,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
} from '@nestjs/common';
import { LecturerService } from './lecturer.service';
import { User } from 'src/auth/user.decorator';
import { AuthRoles, UserRoleGuard } from 'src/auth/role.guard';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { LecturerData, type UserPayload } from 'src/auth/auth.schema';
import {
  EditResultBody,
  type RegisterStudentBody,
  LecturerProfileRes,
  EnrollmentRes,
} from './lecturers.schema';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CourseSessionRes } from 'src/sessions/sessions.schema';

@ApiTags('lecturer', 'Lecturer')
@ApiBearerAuth('accessToken')
@Controller('lecturer')
@AuthRoles([UserRole.LECTURER])
@UseGuards(JwtAuthGuard, UserRoleGuard)
export class LecturerController {
  constructor(private readonly lecturerService: LecturerService) {}

  private getLecturerId(user: UserPayload) {
    const lecturerData = user.userData as LecturerData;
    return lecturerData.lecturerId;
  }

  @ApiOperation({ summary: 'List courses' })
  @ApiOkResponse({ type: [CourseSessionRes] })
  @Get('courses-sessions')
  async listCourseSessions(@User() user: UserPayload) {
    const lecturerId = this.getLecturerId(user);
    return this.lecturerService.listCourseSessions(lecturerId);
  }

  @ApiOperation({ summary: 'Register a student in a course session' })
  @ApiOkResponse({ description: 'Student registered successfully' })
  @ApiForbiddenResponse({
    description:
      'You are not authorized to register students in this course session.',
  })
  @ApiConflictResponse({ description: 'Student already registered' })
  @ApiNotFoundResponse({ description: 'Student not found' })
  @Post('courses-sessions/:courseSessionId/students')
  @HttpCode(HttpStatus.OK)
  async registerStudent(
    @User() user: UserPayload,
    @Param('courseSessionId', ParseUUIDPipe) courseSessionId: string,
    @Body() body: RegisterStudentBody,
  ) {
    const lecturerId = this.getLecturerId(user);
    return await this.lecturerService.registerStudent(
      lecturerId,
      courseSessionId,
      body,
    );
  }

  @Post('courses-sessions/:courseSessionId/students/batch')
  async uploadFileForStudentRegistrations(
    @User() user: UserPayload,
    @Param('courseSessionId', ParseUUIDPipe) courseSessionId: string,
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
    const lecturerId = this.getLecturerId(user);
    return await this.lecturerService.uploadFileForStudentRegistrations(
      user.sub,
      lecturerId,
      courseSessionId,
      file,
    );
  }

  @Post('courses-sessions/:courseSessionId/results')
  async uploadFileForStudentResults(
    @User() user: UserPayload,
    @Param('courseSessionId', ParseUUIDPipe) courseSessionId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const lecturerId = this.getLecturerId(user);
    return await this.lecturerService.uploadFileForStudentResults(
      user.sub,
      lecturerId,
      courseSessionId,
      file,
    );
  }

  @ApiOperation({ summary: "Edit a student's score in a course session" })
  @ApiBody({ type: EditResultBody })
  @ApiOkResponse({ description: 'Result edited successfully' })
  @ApiNotFoundResponse({ description: 'Course session or student not found' })
  @Patch('courses-sessions/:courseSessionId/results/:studentId')
  async editResult(
    @User() user: UserPayload,
    @Param('courseSessionId', ParseUUIDPipe) courseSessionId: string,
    @Param('studentId', ParseUUIDPipe) studentId: string,
    @Body() body: EditResultBody,
  ) {
    const lecturerId = this.getLecturerId(user);
    return await this.lecturerService.editResult(
      lecturerId,
      courseSessionId,
      studentId,
      body,
    );
  }

  @ApiOperation({ summary: 'View results for a course session' })
  @ApiOkResponse({ type: [EnrollmentRes] })
  @ApiNotFoundResponse({ description: 'Course session not found' })
  @Get('courses-sessions/:courseSessionId/results')
  async viewCourseResults(
    @User() user: UserPayload,
    @Param('courseSessionId', ParseUUIDPipe) courseSessionId: string,
  ) {
    const lecturerId = this.getLecturerId(user);
    return await this.lecturerService.viewCourseResults(
      lecturerId,
      courseSessionId,
    );
  }

  @ApiOperation({ summary: 'List students in a course session' })
  @ApiOkResponse({ type: [EnrollmentRes] })
  @ApiNotFoundResponse({ description: 'Course session not found' })
  @Get('courses-sessions/:courseSessionId/students')
  async listCourseStudents(
    @User() user: UserPayload,
    @Param('courseSessionId', ParseUUIDPipe) courseSessionId: string,
  ) {
    const lecturerId = this.getLecturerId(user);
    return await this.lecturerService.listCourseStudents(
      lecturerId,
      courseSessionId,
    );
  }

  @ApiOperation({ summary: 'Get lecturer profile' })
  @ApiOkResponse({ type: LecturerProfileRes })
  @ApiNotFoundResponse({ description: 'Lecturer not found' })
  @Get('profile')
  async getProfile(@User() user: UserPayload) {
    const lecturerId = this.getLecturerId(user);
    return await this.lecturerService.getProfile(lecturerId);
  }
}
