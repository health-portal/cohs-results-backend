import { ApiProperty } from '@nestjs/swagger';
import { Level } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsArray, IsDate, IsEnum, IsUUID } from 'class-validator';
import {
  DepartmentRes,
  IsSequentialAcademicYear,
} from 'src/college/college.schema';
import { CourseRes } from 'src/courses/courses.schema';
import { GradingSystemRes } from 'src/grading-systems/grading-systems.schema';

export class CreateSessionBody {
  @ApiProperty()
  @IsSequentialAcademicYear()
  academicYear: string;

  @ApiProperty({ type: 'string', format: 'date-time' })
  @IsDate()
  @Type(() => Date)
  startDate: Date;

  @ApiProperty({ type: 'string', format: 'date-time' })
  @IsDate()
  @Type(() => Date)
  endDate: Date;
}

export class UpdateSessionBody {
  @ApiProperty({ nullable: true })
  @IsSequentialAcademicYear()
  academicYear?: string;

  @ApiProperty({ type: 'string', format: 'date-time', nullable: true })
  @IsDate()
  @Type(() => Date)
  startDate?: Date;

  @ApiProperty({ type: 'string', format: 'date-time', nullable: true })
  @IsDate()
  @Type(() => Date)
  endDate?: Date;
}

export class AssignCourseToSessionBody {
  @ApiProperty()
  @IsUUID('4')
  courseId: string;

  @ApiProperty()
  @IsUUID('4')
  gradingSystemId: string;
}

export class AssignLecturersBody {
  @ApiProperty()
  @IsArray()
  @IsUUID('4', { each: true })
  lecturerIds: string[];

  @ApiProperty()
  @IsUUID()
  coordinatorId: string;
}

export class AssignDeptAndLevelBody {
  @ApiProperty()
  @IsUUID('4')
  departmentId: string;

  @ApiProperty()
  @IsEnum(Level)
  level: Level;
}

export class DeptAndLevelRes {
  @ApiProperty()
  id: string;

  @ApiProperty({ type: 'string', format: 'date-time' })
  createdAt: Date;

  @ApiProperty({ type: 'string', format: 'date-time' })
  updatedAt: Date;

  @ApiProperty({ type: DepartmentRes })
  department: DepartmentRes;

  @ApiProperty({ enum: Level })
  level: Level;

  @ApiProperty()
  courseSessionId: string;
}

export class SessionRes {
  @ApiProperty()
  id: string;

  @ApiProperty()
  academicYear: string;

  @ApiProperty({ type: 'string', format: 'date-time' })
  startDate: Date;

  @ApiProperty({ type: 'string', format: 'date-time' })
  endDate: Date;
}

export class CourseSessionRes {
  @ApiProperty()
  id: string;

  @ApiProperty({ type: 'string', format: 'date-time' })
  createdAt: Date;

  @ApiProperty({ type: 'string', format: 'date-time' })
  updatedAt: Date;

  @ApiProperty({ type: CourseRes })
  course: CourseRes;

  @ApiProperty({ type: SessionRes })
  session: SessionRes;

  @ApiProperty({ type: GradingSystemRes })
  gradingSystem: GradingSystemRes;

  @ApiProperty({ type: DeptAndLevelRes })
  deptsAndLevels: DeptAndLevelRes[];

  @ApiProperty()
  lecturerCount: number;
}
