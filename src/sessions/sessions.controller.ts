import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { SessionsService } from './sessions.service';
import {
  type AssignCoursesToSessionBody,
  type AssignDeptAndLevelBody,
  type AssignLecturersBody,
  type CreateSessionBody,
  DeptAndLevelRes,
  SessionRes,
} from './sessions.schema';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { AuthRoles, UserRoleGuard } from 'src/auth/role.guard';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { CourseRes } from 'src/courses/courses.schema';
import { LecturerProfileRes } from 'src/lecturers/lecturers.schema';

@ApiTags('Sessions', 'Admin')
@ApiBearerAuth('accessToken')
@Controller('sessions')
@AuthRoles([UserRole.ADMIN])
@UseGuards(JwtAuthGuard, UserRoleGuard)
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @ApiOperation({ summary: 'Create a new session' })
  @ApiCreatedResponse({ description: 'Session created successfully' })
  @ApiConflictResponse({ description: 'Session already exists' })
  @Post()
  async createSession(@Body() body: CreateSessionBody) {
    return await this.sessionsService.createSession(body);
  }

  @ApiOperation({ summary: 'Get all sessions' })
  @ApiOkResponse({ type: [SessionRes] })
  @Get()
  async getSessions() {
    return await this.sessionsService.getSessions();
  }

  @ApiOperation({ summary: 'Get a session' })
  @ApiOkResponse({ type: SessionRes })
  @ApiNotFoundResponse({ description: 'Session not found' })
  @Get(':sessionId')
  async getSession(@Param('sessionId') sessionId: string) {
    return await this.sessionsService.getSession(sessionId);
  }

  @ApiOperation({ summary: 'Assign courses to a session' })
  @ApiCreatedResponse({ description: 'Courses assigned successfully' })
  @ApiNotFoundResponse({ description: 'Session not found' })
  @Post(':sessionId/courses')
  async assignCoursesToSession(
    @Param('sessionId') sessionId: string,
    @Body() body: AssignCoursesToSessionBody,
  ) {
    return await this.sessionsService.assignCoursesToSession(sessionId, body);
  }

  @ApiOperation({ summary: 'Get courses assigned to a session' })
  @ApiOkResponse({ type: [CourseRes] })
  @ApiNotFoundResponse({ description: 'Session not found' })
  @Get(':sessionId/courses')
  async getCoursesInSession(@Param('sessionId') sessionId: string) {
    return await this.sessionsService.getCoursesInSession(sessionId);
  }

  @ApiOperation({ summary: 'Assign lecturers to a course' })
  @ApiCreatedResponse({ description: 'Lecturers assigned successfully' })
  @ApiBadRequestResponse({
    description: 'Invalid session or course or lecturer information',
  })
  @Post(':sessionId/courses/:courseId/lecturers')
  async assignLecturersToCourse(
    @Param('sessionId') sessionId: string,
    @Param('courseId') courseId: string,
    @Body() body: AssignLecturersBody,
  ) {
    return await this.sessionsService.assignLecturersToCourse(
      sessionId,
      courseId,
      body,
    );
  }

  @ApiOperation({ summary: 'Get lecturers assigned to a course' })
  @ApiOkResponse({ type: [LecturerProfileRes] })
  @ApiNotFoundResponse({ description: 'Session or course not found' })
  @Get(':sessionId/courses/:courseId/lecturers')
  async getCourseLecturers(
    @Param('sessionId') sessionId: string,
    @Param('courseId') courseId: string,
  ) {
    return await this.sessionsService.getCourseLecturers(sessionId, courseId);
  }

  @ApiOperation({ summary: 'Assign departments and levels to a course' })
  @ApiCreatedResponse({
    description: 'Departments and levels assigned successfully',
  })
  @ApiBadRequestResponse({
    description: 'Invalid session or course or department or level information',
  })
  @Post(':sessionId/courses/:courseId/depts-and-levels')
  async assignDeptsAndLevelsToCourse(
    @Param('sessionId') sessionId: string,
    @Param('courseId') courseId: string,
    @Body() body: AssignDeptAndLevelBody[],
  ) {
    return await this.sessionsService.assignDeptsAndLevelsToCourse(
      sessionId,
      courseId,
      body,
    );
  }

  @ApiOperation({ summary: 'Get departments and levels assigned to a course' })
  @ApiOkResponse({ type: [DeptAndLevelRes] })
  @ApiNotFoundResponse({ description: 'Session or course not found' })
  @Get(':sessionId/courses/:courseId/depts-and-levels')
  async getDeptsAndLevelsForCourse(
    @Param('sessionId') sessionId: string,
    @Param('courseId') courseId: string,
  ) {
    return await this.sessionsService.getDeptsAndLevelsForCourse(
      sessionId,
      courseId,
    );
  }
}
