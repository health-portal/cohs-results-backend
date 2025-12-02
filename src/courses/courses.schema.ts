import { ApiProperty } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import {
	IsEnum,
	IsNotEmpty,
	IsNumber,
	IsOptional,
	IsString,
} from "class-validator";
import { Semester } from "@prisma/client";
import { DepartmentRes } from "src/college/college.schema";
import { ParseCsvData } from "src/lib/csv";

export class CreateCourseBody {
	@ApiProperty()
	@IsString()
	@IsNotEmpty()
	code: string;

	@ApiProperty()
	@IsString()
	@IsNotEmpty()
	title: string;

	@ApiProperty()
	@IsString()
	@IsNotEmpty()
	description: string;

	@ApiProperty()
	@IsString()
	@IsNotEmpty()
	department: string;

	@ApiProperty()
	@IsNumber()
	@Transform(({ value }: { value: string }) => parseInt(value, 10), {
		toClassOnly: true,
	})
	units: number;

	@ApiProperty({ enum: Semester })
	@IsEnum(Semester)
	semester: Semester;
}

export class UpdateCourseBody {
	@ApiProperty()
	@IsString()
	@IsOptional()
	title?: string;

	@ApiProperty()
	@IsString()
	@IsOptional()
	description?: string;
}

export class CreateCourseRes extends CreateCourseBody {
	@ApiProperty()
	isCreated: boolean;
}

export class CreateCoursesRes extends ParseCsvData<CreateCourseBody> {
	@ApiProperty({ type: [CreateCourseRes] })
	courses: CreateCourseRes[];
}

export class CourseRes {
	@ApiProperty()
	id: string;

	@ApiProperty()
	code: string;

	@ApiProperty({ nullable: true })
	description: string | null;

	@ApiProperty()
	title: string;

	@ApiProperty()
	units: number;

	@ApiProperty({ enum: Semester })
	semester: Semester;

	@ApiProperty({ type: DepartmentRes })
	department: DepartmentRes;
}
