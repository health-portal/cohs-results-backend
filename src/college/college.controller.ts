import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CollegeService } from './college.service';
import {
  type CreateDepartmentBody,
  type CreateFacultyBody,
  DepartmentRes,
  FacultyRes,
} from './college.schema';
import { AuthRoles, UserRoleGuard } from 'src/auth/role.guard';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

@ApiTags('College', 'Admin')
@ApiBearerAuth('accessToken')
@Controller('college')
@AuthRoles([UserRole.ADMIN])
@UseGuards(JwtAuthGuard, UserRoleGuard)
export class CollegeController {
  constructor(private readonly collegeService: CollegeService) {}

  @ApiOperation({ summary: 'Get all faculties' })
  @ApiOkResponse({ type: [FacultyRes] })
  @Get('faculties')
  async getFaculties() {
    return await this.collegeService.getFaculties();
  }

  @ApiOperation({ summary: 'Get all departments' })
  @ApiOkResponse({ type: [DepartmentRes] })
  @Get('departments')
  async getDepartments() {
    return await this.collegeService.getDepartments();
  }

  @ApiOperation({ summary: 'Create a new faculty' })
  @ApiCreatedResponse({ description: 'Faculty created successfully' })
  @ApiConflictResponse({ description: 'Faculty already exists' })
  @Post('faculties')
  async createFaculty(@Body() body: CreateFacultyBody) {
    return await this.collegeService.createFaculty(body);
  }

  @ApiOperation({ summary: 'Delete a faculty' })
  @ApiOkResponse({ description: 'Faculty deleted successfully' })
  @ApiNotFoundResponse({ description: 'Faculty not found' })
  @Delete('faculties/:facultyId')
  async deleteFaculty(@Param('facultyId', ParseUUIDPipe) facultyId: string) {
    return await this.collegeService.deleteFaculty(facultyId);
  }

  @ApiOperation({ summary: 'Create a new department' })
  @ApiCreatedResponse({ description: 'Department created successfully' })
  @ApiConflictResponse({ description: 'Department already exists' })
  @Post('departments')
  async createDepartment(@Body() body: CreateDepartmentBody) {
    return await this.collegeService.createDepartment(body);
  }

  @ApiOperation({ summary: 'Delete a department' })
  @ApiOkResponse({ description: 'Department deleted successfully' })
  @ApiNotFoundResponse({ description: 'Department not found' })
  @Delete('departments/:deptId')
  async deleteDepartment(@Param('deptId', ParseUUIDPipe) deptId: string) {
    return await this.collegeService.deleteDepartment(deptId);
  }
}
