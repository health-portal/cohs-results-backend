import { ApiProperty } from "@nestjs/swagger";
import { Gender, Level } from "@prisma/client";
import {
	IsEmail,
	IsEnum,
	IsNotEmpty,
	IsOptional,
	IsString,
} from "class-validator";
import { IsSequentialAcademicYear } from "src/college/college.schema";
import { ParseCsvData } from "src/lib/csv";

export class CreateStudentBody {
	@ApiProperty()
	@IsEmail()
	email: string;

	@ApiProperty()
	@IsString()
	@IsNotEmpty()
	matricNumber: string;

	@ApiProperty()
	@IsString()
	@IsNotEmpty()
	firstName: string;

	@ApiProperty()
	@IsString()
	@IsNotEmpty()
	lastName: string;

	@ApiProperty({ required: false })
	@IsString()
	@IsOptional()
	otherName?: string;

	@ApiProperty()
	@IsString()
	@IsNotEmpty()
	department: string;

	@ApiProperty()
	@IsEnum(Level)
	level: Level;

	@ApiProperty()
	@IsSequentialAcademicYear()
	admissionYear: string;

	@ApiProperty({ enum: Gender })
	@IsEnum(Gender)
	gender: Gender;

	@ApiProperty()
	@IsString()
	@IsNotEmpty()
	degree: string;
}

export class UpdateStudentBody {
	@ApiProperty({ required: false })
	@IsString()
	@IsOptional()
	firstName?: string;

	@ApiProperty({ required: false })
	@IsString()
	@IsOptional()
	lastName?: string;

	@ApiProperty({ required: false })
	@IsString()
	@IsOptional()
	otherName?: string;

	@ApiProperty({ required: false })
	@IsString()
	@IsOptional()
	department?: string;

	@ApiProperty()
	@IsEnum(Level)
	level?: Level;

	@ApiProperty({ enum: Gender, required: false })
	@IsEnum(Gender)
	gender?: Gender;

	@ApiProperty()
	@IsSequentialAcademicYear()
	@IsOptional()
	admissionYear?: string;

	@ApiProperty({ required: false })
	@IsString()
	@IsOptional()
	degree?: string;
}

export class CreateStudentRes extends CreateStudentBody {
	@ApiProperty()
	isCreated: boolean;
}

export class CreateStudentsRes extends ParseCsvData<CreateStudentBody> {
	@ApiProperty({ type: [CreateStudentRes] })
	students: CreateStudentRes[];
}

export class StudentProfileRes {
	@ApiProperty()
	id: string;

	@ApiProperty()
	email: string;

	@ApiProperty()
	matricNumber: string;

	@ApiProperty()
	firstName: string;

	@ApiProperty()
	lastName: string;

	@ApiProperty()
	otherName: string;

	@ApiProperty()
	department: string;

	@ApiProperty()
	level: Level;

	@ApiProperty()
	gender: Gender;

	@ApiProperty()
	admissionYear: string;

	@ApiProperty()
	degree: string;
}
