import { ApiProperty, PickType } from '@nestjs/swagger';
import {
  CourseLecturerResponse,
  CourseResponse,
  CourseSesnDeptAndLevelResponse,
  CourseSessionResponse,
  LecturerResponse,
  SessionResponse,
} from 'src/prisma/prisma.responses';

export class DeptAndLevelRes extends PickType(CourseSesnDeptAndLevelResponse, [
  'id',
  'level',
]) {
  @ApiProperty({ readOnly: true })
  department: string;
}

export class SessionRes extends PickType(SessionResponse, [
  'id',
  'academicYear',
  'startDate',
  'endDate',
]) {}

export class Course extends PickType(CourseResponse, [
  'id',
  'code',
  'units',
  'semester',
]) {
  @ApiProperty({ readOnly: true })
  department: string;
}

export class Session extends PickType(SessionResponse, [
  'id',
  'academicYear',
]) {}

export class CourseSessionRes extends PickType(CourseSessionResponse, ['id']) {
  @ApiProperty({ readOnly: true, type: Course })
  course: Course;

  @ApiProperty({ type: Session, readOnly: true })
  session: Session;

  @ApiProperty({ readOnly: true })
  gradingSystem: string;

  @ApiProperty({ readOnly: true, type: DeptAndLevelRes })
  deptsAndLevels: DeptAndLevelRes[];

  @ApiProperty()
  lecturerCount: number;
}

class Lecturer extends PickType(LecturerResponse, [
  'id',
  'firstName',
  'otherName',
  'lastName',
  'title',
]) {
  @ApiProperty({ readOnly: true })
  email: string;

  @ApiProperty({ readOnly: true })
  department: string;
}

export class CourseLecturerRes extends PickType(CourseLecturerResponse, [
  'id',
  'isCoordinator',
]) {
  @ApiProperty({ type: Lecturer, readOnly: true })
  lecturer: Lecturer;
}
