import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { StudentService } from './student.service';
import { User } from 'src/auth/user.decorator';
import { type UserPayload, StudentData } from 'src/auth/auth.schema';
import { ChangePasswordBody } from 'src/auth/auth.schema';
import { UserRole } from '@prisma/client';
import { AuthRoles, UserRoleGuard } from 'src/auth/role.guard';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { EnrollmentRes } from 'src/lecturers/lecturers.schema';
import { StudentProfileRes } from './students.schema';

@ApiTags('Student')
@ApiBearerAuth('accessToken')
@Controller('student')
@AuthRoles([UserRole.STUDENT])
@UseGuards(JwtAuthGuard, UserRoleGuard)
export class StudentController {
  constructor(private readonly studentService: StudentService) {}

  @ApiOperation({ summary: 'Change password' })
  @ApiBody({ type: ChangePasswordBody })
  @ApiOkResponse({ description: 'Password changed successfully' })
  @ApiBadRequestResponse({ description: 'Invalid credentials' })
  @Post('change-password')
  async changePassword(
    @User() user: UserPayload,
    @Body() body: ChangePasswordBody,
  ) {
    const studentData = user.userData as StudentData;
    return await this.studentService.changePassword(
      studentData.studentId,
      body,
    );
  }

  @ApiOperation({ summary: "List all student's enrollments" })
  @ApiOkResponse({ type: [EnrollmentRes] })
  @Get('enrollments')
  async listEnrollments(@User() user: UserPayload) {
    const studentData = user.userData as StudentData;
    return await this.studentService.listEnrollments(studentData.studentId);
  }

  @ApiOperation({ summary: "Get a student's enrollment by ID" })
  @ApiOkResponse({ type: EnrollmentRes })
  @ApiNotFoundResponse({ description: 'Enrollment not found' })
  @Get('enrollments/:enrollmentId')
  async listEnrollment(
    @User() user: UserPayload,
    @Param('enrollmentId', ParseUUIDPipe) enrollmentId: string,
  ) {
    const studentData = user.userData as StudentData;
    return await this.studentService.listEnrollment(
      studentData.studentId,
      enrollmentId,
    );
  }

  @ApiOperation({ summary: 'Get student profile' })
  @ApiOkResponse({ type: StudentProfileRes })
  @Get('profile')
  async getProfile(@User() user: UserPayload) {
    const studentData = user.userData as StudentData;
    return await this.studentService.getProfile(studentData.studentId);
  }
}
