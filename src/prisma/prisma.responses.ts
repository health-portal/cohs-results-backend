import { ApiProperty } from '@nestjs/swagger';
import {
  UserRole,
  Gender,
  StudentStatus,
  Semester,
  LecturerRole,
  FileCategory,
  EnrollmentStatus,
  Level,
  ResultType,
} from '@prisma/client';

export class UserResponse {
  @ApiProperty({ readOnly: true })
  id: string;

  @ApiProperty({ type: 'string', format: 'date-time', readOnly: true })
  createdAt: string;

  @ApiProperty({ type: 'string', format: 'date-time', readOnly: true })
  updatedAt: string;

  @ApiProperty({
    type: 'string',
    format: 'date-time',
    nullable: true,
    readOnly: true,
  })
  deletedAt: string | null;

  @ApiProperty({ readOnly: true })
  email: string;

  @ApiProperty({ nullable: true, readOnly: true })
  password: string | null;

  @ApiProperty({ enum: UserRole, readOnly: true })
  role: UserRole;
}

export class AdminResponse {
  @ApiProperty({ readOnly: true })
  id: string;

  @ApiProperty({ type: 'string', format: 'date-time', readOnly: true })
  createdAt: string;

  @ApiProperty({ type: 'string', format: 'date-time', readOnly: true })
  updatedAt: string;

  @ApiProperty({
    type: 'string',
    format: 'date-time',
    nullable: true,
    readOnly: true,
  })
  deletedAt: string | null;

  @ApiProperty({ readOnly: true })
  name: string;

  @ApiProperty({ nullable: true, readOnly: true })
  phone: string | null;

  @ApiProperty({ readOnly: true })
  userId: string;
}

export class LecturerResponse {
  @ApiProperty({ readOnly: true })
  id: string;

  @ApiProperty({ type: 'string', format: 'date-time', readOnly: true })
  createdAt: string;

  @ApiProperty({ type: 'string', format: 'date-time', readOnly: true })
  updatedAt: string;

  @ApiProperty({
    type: 'string',
    format: 'date-time',
    nullable: true,
    readOnly: true,
  })
  deletedAt: string | null;

  @ApiProperty({ readOnly: true })
  firstName: string;

  @ApiProperty({ readOnly: true })
  lastName: string;

  @ApiProperty({ nullable: true, readOnly: true })
  otherName: string | null;

  @ApiProperty({ nullable: true, readOnly: true })
  phone: string | null;

  @ApiProperty({ enum: Gender, readOnly: true })
  gender: Gender;

  @ApiProperty({ readOnly: true })
  title: string;

  @ApiProperty({ nullable: true, readOnly: true })
  qualification: string | null;

  @ApiProperty({ readOnly: true })
  userId: string;

  @ApiProperty({ readOnly: true })
  departmentId: string;
}

export class LecturerDesignationResponse {
  @ApiProperty({ readOnly: true })
  id: string;

  @ApiProperty({ type: 'string', format: 'date-time', readOnly: true })
  createdAt: string;

  @ApiProperty({ readOnly: true })
  entity: string;

  @ApiProperty({ enum: LecturerRole, readOnly: true })
  role: LecturerRole;

  @ApiProperty({ readOnly: true })
  lecturerId: string;
}

export class StudentResponse {
  @ApiProperty({ readOnly: true })
  id: string;

  @ApiProperty({ type: 'string', format: 'date-time', readOnly: true })
  createdAt: string;

  @ApiProperty({ type: 'string', format: 'date-time', readOnly: true })
  updatedAt: string;

  @ApiProperty({
    type: 'string',
    format: 'date-time',
    nullable: true,
    readOnly: true,
  })
  deletedAt: string | null;

  @ApiProperty({ readOnly: true })
  matricNumber: string;

  @ApiProperty({ readOnly: true })
  firstName: string;

  @ApiProperty({ readOnly: true })
  lastName: string;

  @ApiProperty({ nullable: true, readOnly: true })
  otherName: string | null;

  @ApiProperty({ readOnly: true })
  admissionYear: string;

  @ApiProperty({ enum: Level, readOnly: true })
  level: Level;

  @ApiProperty({ enum: Gender, readOnly: true })
  gender: Gender;

  @ApiProperty({ readOnly: true })
  degree: string;

  @ApiProperty({ enum: StudentStatus, readOnly: true })
  status: StudentStatus;

  @ApiProperty({ readOnly: true })
  userId: string;

  @ApiProperty({ readOnly: true })
  departmentId: string;
}

export class FacultyResponse {
  @ApiProperty({ readOnly: true })
  id: string;

  @ApiProperty({ type: 'string', format: 'date-time', readOnly: true })
  createdAt: string;

  @ApiProperty({ type: 'string', format: 'date-time', readOnly: true })
  updatedAt: string;

  @ApiProperty({
    type: 'string',
    format: 'date-time',
    nullable: true,
    readOnly: true,
  })
  deletedAt: string | null;

  @ApiProperty({ readOnly: true })
  name: string;
}

export class DepartmentResponse {
  @ApiProperty({ readOnly: true })
  id: string;

  @ApiProperty({ type: 'string', format: 'date-time', readOnly: true })
  createdAt: string;

  @ApiProperty({ type: 'string', format: 'date-time', readOnly: true })
  updatedAt: string;

  @ApiProperty({
    type: 'string',
    format: 'date-time',
    nullable: true,
    readOnly: true,
  })
  deletedAt: string | null;

  @ApiProperty({ readOnly: true })
  name: string;

  @ApiProperty({ readOnly: true })
  shortName: string;

  @ApiProperty({ enum: Level, readOnly: true })
  maxLevel: Level;

  @ApiProperty({ readOnly: true })
  facultyId: string;
}

export class SessionResponse {
  @ApiProperty({ readOnly: true })
  id: string;

  @ApiProperty({ type: 'string', format: 'date-time', readOnly: true })
  createdAt: string;

  @ApiProperty({ type: 'string', format: 'date-time', readOnly: true })
  updatedAt: string;

  @ApiProperty({
    type: 'string',
    format: 'date-time',
    nullable: true,
    readOnly: true,
  })
  deletedAt: string | null;

  @ApiProperty({ readOnly: true })
  academicYear: string;

  @ApiProperty({ type: 'string', format: 'date-time', readOnly: true })
  startDate: string;

  @ApiProperty({ type: 'string', format: 'date-time', readOnly: true })
  endDate: string;
}

export class CourseResponse {
  @ApiProperty({ readOnly: true })
  id: string;

  @ApiProperty({ type: 'string', format: 'date-time', readOnly: true })
  createdAt: string;

  @ApiProperty({ type: 'string', format: 'date-time', readOnly: true })
  updatedAt: string;

  @ApiProperty({
    type: 'string',
    format: 'date-time',
    nullable: true,
    readOnly: true,
  })
  deletedAt: string | null;

  @ApiProperty({ readOnly: true })
  code: string;

  @ApiProperty({ readOnly: true })
  title: string;

  @ApiProperty({ readOnly: true })
  description: string;

  @ApiProperty({ readOnly: true })
  units: number;

  @ApiProperty({ enum: Semester, readOnly: true })
  semester: Semester;

  @ApiProperty({ readOnly: true })
  departmentId: string;
}

export class CourseSessionResponse {
  @ApiProperty({ readOnly: true })
  id: string;

  @ApiProperty({ type: 'string', format: 'date-time', readOnly: true })
  createdAt: string;

  @ApiProperty({ type: 'string', format: 'date-time', readOnly: true })
  updatedAt: string;

  @ApiProperty({ readOnly: true })
  isApproved: boolean;

  @ApiProperty({
    type: 'string',
    format: 'date-time',
    nullable: true,
    readOnly: true,
  })
  approvedAt: string | null;

  @ApiProperty({ readOnly: true })
  isPublished: boolean;

  @ApiProperty({
    type: 'string',
    format: 'date-time',
    nullable: true,
    readOnly: true,
  })
  publishedAt: string | null;

  @ApiProperty({ readOnly: true })
  courseId: string;

  @ApiProperty({ readOnly: true })
  gradingSystemId: string;

  @ApiProperty({ readOnly: true })
  sessionId: string;
}

export class GradingSystemResponse {
  @ApiProperty({ readOnly: true })
  id: string;

  @ApiProperty({ type: 'string', format: 'date-time', readOnly: true })
  createdAt: string;

  @ApiProperty({ type: 'string', format: 'date-time', readOnly: true })
  updatedAt: string;

  @ApiProperty({
    type: 'string',
    format: 'date-time',
    nullable: true,
    readOnly: true,
  })
  deletedAt: string | null;

  @ApiProperty({ readOnly: true })
  name: string;

  @ApiProperty({ nullable: true, readOnly: true })
  description: string | null;

  @ApiProperty({ readOnly: true })
  threshold: number;
}

export class GradingFieldResponse {
  @ApiProperty({ readOnly: true })
  id: string;

  @ApiProperty({ type: 'string', format: 'date-time', readOnly: true })
  createdAt: string;

  @ApiProperty({ type: 'string', format: 'date-time', readOnly: true })
  updatedAt: string;

  @ApiProperty({ readOnly: true })
  label: string;

  @ApiProperty({ readOnly: true })
  description: string;

  @ApiProperty({ readOnly: true })
  variable: string;

  @ApiProperty({ readOnly: true })
  maxScore: number;

  @ApiProperty({ readOnly: true })
  weight: number;

  @ApiProperty({ readOnly: true })
  gradingSystemId: string;
}

export class GradingRangeResponse {
  @ApiProperty({ readOnly: true })
  id: string;

  @ApiProperty({ type: 'string', format: 'date-time', readOnly: true })
  createdAt: string;

  @ApiProperty({ type: 'string', format: 'date-time', readOnly: true })
  updatedAt: string;

  @ApiProperty({ readOnly: true })
  label: string;

  @ApiProperty({ readOnly: true })
  description: string;

  @ApiProperty({ readOnly: true })
  minScore: number;

  @ApiProperty({ readOnly: true })
  maxScore: number;

  @ApiProperty({ readOnly: true })
  gradingSystemId: string;
}

export class CourseLecturerResponse {
  @ApiProperty({ readOnly: true })
  id: string;

  @ApiProperty({ type: 'string', format: 'date-time', readOnly: true })
  createdAt: string;

  @ApiProperty({ type: 'string', format: 'date-time', readOnly: true })
  updatedAt: string;

  @ApiProperty({ readOnly: true })
  isCoordinator: boolean;

  @ApiProperty({ readOnly: true })
  courseSessionId: string;

  @ApiProperty({ readOnly: true })
  lecturerId: string;
}

export class CourseSesnDeptAndLevelResponse {
  @ApiProperty({ readOnly: true })
  id: string;

  @ApiProperty({ type: 'string', format: 'date-time', readOnly: true })
  createdAt: string;

  @ApiProperty({ type: 'string', format: 'date-time', readOnly: true })
  updatedAt: string;

  @ApiProperty({ enum: Level, readOnly: true })
  level: Level;

  @ApiProperty({ readOnly: true })
  departmentId: string;

  @ApiProperty({ readOnly: true })
  courseSessionId: string;
}

export class EnrollmentResponse {
  @ApiProperty({ readOnly: true })
  id: string;

  @ApiProperty({ type: 'string', format: 'date-time', readOnly: true })
  createdAt: string;

  @ApiProperty({ type: 'string', format: 'date-time', readOnly: true })
  updatedAt: string;

  @ApiProperty({ enum: EnrollmentStatus, readOnly: true })
  status: EnrollmentStatus;

  @ApiProperty({ enum: Level, readOnly: true })
  levelAtEnrollment: Level;

  @ApiProperty({ readOnly: true })
  studentId: string;

  @ApiProperty({ readOnly: true })
  courseSessionId: string;
}

export class ResultResponse {
  @ApiProperty({ readOnly: true })
  id: string;

  @ApiProperty({ type: 'string', format: 'date-time', readOnly: true })
  createdAt: string;

  @ApiProperty({ type: 'string', format: 'date-time', readOnly: true })
  updatedAt: string;

  @ApiProperty({ type: 'object', additionalProperties: true, readOnly: true })
  scores: Record<string, any>;

  @ApiProperty({
    type: 'object',
    additionalProperties: true,
    nullable: true,
    readOnly: true,
  })
  evaluations: Record<string, any> | null;

  @ApiProperty({ enum: ResultType, readOnly: true })
  type: ResultType;

  @ApiProperty({ readOnly: true })
  enrollmentId: string;
}

export class FileResponse {
  @ApiProperty({ readOnly: true })
  id: string;

  @ApiProperty({ type: 'string', format: 'date-time', readOnly: true })
  createdAt: string;

  @ApiProperty({
    type: 'string',
    format: 'date-time',
    nullable: true,
    readOnly: true,
  })
  deletedAt: string | null;

  @ApiProperty({ readOnly: true })
  filename: string;

  @ApiProperty({ nullable: true, readOnly: true })
  description: string | null;

  @ApiProperty({ type: 'string', format: 'binary', readOnly: true })
  buffer: any;

  @ApiProperty({ readOnly: true })
  mimetype: string;

  @ApiProperty({ readOnly: true })
  isProcessed: boolean;

  @ApiProperty({ enum: FileCategory, readOnly: true })
  category: FileCategory;

  @ApiProperty({
    type: 'object',
    additionalProperties: true,
    nullable: true,
    readOnly: true,
  })
  metadata: Record<string, any> | null;

  @ApiProperty({ readOnly: true })
  userId: string;
}

export class AuditLogResponse {
  @ApiProperty({ readOnly: true })
  id: string;

  @ApiProperty({ type: 'string', format: 'date-time', readOnly: true })
  createdAt: string;

  @ApiProperty({ readOnly: true })
  actorInfo: string;

  @ApiProperty({ readOnly: true })
  action: string;

  @ApiProperty({ readOnly: true })
  entity: string;

  @ApiProperty({ readOnly: true })
  entityId: string;

  @ApiProperty({
    type: 'object',
    additionalProperties: true,
    nullable: true,
    readOnly: true,
  })
  details: Record<string, any> | null;
}
