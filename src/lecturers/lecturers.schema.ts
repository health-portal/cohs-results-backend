import { ApiProperty } from "@nestjs/swagger";
import {
	EnrollmentStatus,
	type Level,
	type ResultType,
	Semester,
} from "@prisma/client";
import {
	IsEmail,
	IsNotEmpty,
	IsObject,
	IsOptional,
	IsString,
} from "class-validator";
import { ParseCsvData } from "src/lib/csv";

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

export class CourseSessionRes {
	@ApiProperty()
	academicYear: string;

	@ApiProperty()
	description: string;

	@ApiProperty()
	code: string;

	@ApiProperty()
	title: string;

	@ApiProperty()
	units: number;

	@ApiProperty({ enum: Semester })
	semester: Semester;
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

	@ApiProperty()
	title: string;

	@ApiProperty()
	qualification: string;
}
