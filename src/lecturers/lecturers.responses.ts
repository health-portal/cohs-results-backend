import { ApiProperty, PickType } from '@nestjs/swagger';
import {
  CreateLecturerBody,
  RegisterStudentBody,
  UploadResultRow,
} from './lecturers.dto';
import { ParseCsvData } from 'src/files/files.dto';
import {
  CourseSesnDeptAndLevelResponse,
  CourseSessionResponse,
  EnrollmentResponse,
  LecturerResponse,
  ResultResponse,
  StudentResponse,
} from 'src/prisma/prisma.responses';

export class CreateLecturerRes extends CreateLecturerBody {
  @ApiProperty()
  isCreated: boolean;
}

export class CreateLecturersRes extends ParseCsvData<CreateLecturerBody> {
  @ApiProperty({ type: [CreateLecturerRes] })
  lecturers: CreateLecturerRes[];
}

export class UploadResultsRes extends ParseCsvData<UploadResultRow> {
  @ApiProperty()
  studentsUploadedFor: string[];

  @ApiProperty()
  studentsNotFound: string[];
}

export class RegisterStudentsRes extends ParseCsvData<RegisterStudentBody> {
  @ApiProperty()
  registeredStudents: string[];

  @ApiProperty()
  unregisteredStudents: string[];
}

class Student extends PickType(StudentResponse, [
  'id',
  'firstName',
  'otherName',
  'lastName',
  'matricNumber',
  'level',
]) {
  @ApiProperty({ readOnly: true })
  department: string;
}

class Result extends PickType(ResultResponse, [
  'id',
  'scores',
  'evaluations',
  'type',
]) {}

export class EnrollmentRes extends PickType(EnrollmentResponse, [
  'id',
  'status',
]) {
  @ApiProperty({ type: Student, readOnly: true })
  student: Student;
}

export class EnrollmentWithResultRes extends EnrollmentRes {
  @ApiProperty({ type: [Result], readOnly: true })
  results: Result[];
}

export class LecturerProfileRes extends PickType(LecturerResponse, [
  'id',
  'firstName',
  'otherName',
  'lastName',
  'title',
  'qualification',
  'gender',
  'phone',
]) {
  @ApiProperty({ readOnly: true })
  email: string;

  @ApiProperty({ readOnly: true })
  department: string;
}

class DeptAndLevel extends PickType(CourseSesnDeptAndLevelResponse, ['level']) {
  @ApiProperty({ readOnly: true })
  department: string;
}

export class LecturerCourseSessionRes extends PickType(CourseSessionResponse, [
  'id',
]) {
  @ApiProperty({ readOnly: true })
  courseCode: string;

  @ApiProperty({ readOnly: true })
  session: string;

  @ApiProperty({ readOnly: true })
  gradingSystem: string;

  @ApiProperty({ readOnly: true })
  enrollmentCount: number;

  @ApiProperty({ readOnly: true })
  lecturerCount: number;

  @ApiProperty({ type: [DeptAndLevel], readOnly: true })
  deptsAndLevels: DeptAndLevel[];
}
