import { ApiProperty } from '@nestjs/swagger';
import {
  EnrollmentStatus,
  Gender,
  type Level,
  type ResultType,
} from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';
import { ParseCsvData } from 'src/files/files.schema';

export class CreateLecturerBody {
  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  otherName?: string;

  @ApiProperty({ enum: Gender })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.toUpperCase().trim() : value,
  )
  @IsEnum(Gender)
  gender: Gender;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  department: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  title: string;
}

export class UpdateLecturerBody {
  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  otherName?: string;

  @ApiProperty({ enum: Gender })
  @IsEnum(Gender)
  gender: Gender;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  department: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  title?: string;
}

export class CreateLecturerRes extends CreateLecturerBody {
  @ApiProperty()
  isCreated: boolean;
}

export class CreateLecturersRes extends ParseCsvData<CreateLecturerBody> {
  @ApiProperty({ type: [CreateLecturerRes] })
  lecturers: CreateLecturerRes[];
}

export class EditResultBody {
  @ApiProperty()
  @IsObject()
  scores: Record<string, number>;
}

export class GetLecturersQuery {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  department?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  title?: string;
}

export class UploadResultRow {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  matricNumber: string;

  @ApiProperty()
  @IsObject()
  scores: Record<string, number>;
}

export class UploadResultsRes extends ParseCsvData<UploadResultRow> {
  @ApiProperty()
  studentsUploadedFor: string[];

  @ApiProperty()
  studentsNotFound: string[];
}

export class RegisterStudentBody {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  matricNumber: string;

  @ApiProperty({ type: Object })
  @IsObject()
  scores: Record<string, number>;
}

export class RegisterStudentsRes extends ParseCsvData<RegisterStudentBody> {
  @ApiProperty()
  registeredStudents: string[];

  @ApiProperty()
  unregisteredStudents: string[];
}

class Result {
  @ApiProperty()
  scores: object;

  @ApiProperty()
  type: ResultType;
}

export class EnrollmentRes {
  @ApiProperty()
  id: string;

  @ApiProperty({ enum: EnrollmentStatus })
  status: EnrollmentStatus;

  @ApiProperty()
  studentId: string;

  @ApiProperty()
  studentName: string;

  @ApiProperty()
  studentLevel: Level;

  @ApiProperty()
  studentDepartment: string;

  @ApiProperty({ type: [Result], nullable: true })
  results: Result[] | null;
}

export class LecturerProfileRes {
  @ApiProperty()
  id: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  firstName: string;

  @ApiProperty()
  lastName: string;

  @ApiProperty({ nullable: true })
  otherName: string | null;

  @ApiProperty({ nullable: true })
  phone: string | null;

  @ApiProperty()
  department: string;

  @ApiProperty({ nullable: true })
  title: string | null;

  @ApiProperty({ nullable: true })
  qualification: string | null;
}

export class CourseLecturerRes {
  @ApiProperty()
  isCoordinator: boolean;

  @ApiProperty({ type: LecturerProfileRes })
  lecturer: LecturerProfileRes;
}
