import { ApiProperty } from "@nestjs/swagger";
import { Level } from "@prisma/client";
import { Type } from "class-transformer";
import { IsArray, IsDate, IsEnum, IsUUID } from "class-validator";
import {
	DepartmentRes,
	IsSequentialAcademicYear,
} from "src/college/college.schema";

export class CreateSessionBody {
	@ApiProperty()
	@IsSequentialAcademicYear()
	academicYear: string;

	@ApiProperty({ type: "string", format: "date-time" })
	@IsDate()
	@Type(() => Date)
	startDate: Date;

	@ApiProperty({ type: "string", format: "date-time" })
	@IsDate()
	@Type(() => Date)
	endDate: Date;
}

export class AssignCoursesToSessionBody {
	@ApiProperty()
	@IsArray()
	@IsUUID("4", { each: true })
	courseIds: string[];
}

export class AssignLecturersBody {
	@ApiProperty()
	@IsArray()
	@IsUUID("4", { each: true })
	lecturerIds: string[];

	@ApiProperty()
	@IsUUID()
	coordinatorId: string;
}

export class AssignDeptAndLevelBody {
	@ApiProperty()
	@IsUUID("4")
	departmentId: string;

	@ApiProperty()
	@IsEnum(Level)
	level: Level;
}

export class DeptAndLevelRes {
	@ApiProperty({ type: DepartmentRes })
	department: DepartmentRes;

	@ApiProperty({ enum: Level })
	level: Level;
}

export class SessionRes {
	@ApiProperty()
	id: string;

	@ApiProperty()
	academicYear: string;

	@ApiProperty({ type: "string", format: "date-time" })
	startDate: Date;

	@ApiProperty({ type: "string", format: "date-time" })
	endDate: Date;
}
