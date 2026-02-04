import { ApiProperty, PickType } from '@nestjs/swagger';
import { ParseCsvData } from 'src/files/files.dto';
import {
  EnrollmentResponse,
  ResultResponse,
  StudentResponse,
} from 'src/prisma/prisma.responses';
import { CreateStudentBody } from './students.dto';

export class CreateStudentRes extends CreateStudentBody {
  @ApiProperty()
  isCreated: boolean;
}

export class CreateStudentsRes extends ParseCsvData<CreateStudentBody> {
  @ApiProperty({ type: [CreateStudentRes] })
  students: CreateStudentRes[];
}

class Result extends PickType(ResultResponse, [
  'scores',
  'evaluations',
  'type',
]) {}

export class StudentEnrollmentRes extends PickType(EnrollmentResponse, [
  'id',
  'status',
  'levelAtEnrollment',
]) {
  @ApiProperty({ type: [Result], readOnly: true })
  results: Result[];
}

export class StudentProfileRes extends PickType(StudentResponse, [
  'id',
  'matricNumber',
  'firstName',
  'lastName',
  'otherName',
  'level',
  'gender',
  'admissionYear',
  'degree',
  'status',
]) {
  @ApiProperty({ readOnly: true })
  email: string;

  @ApiProperty({ readOnly: true })
  department: string;
}
