import { ApiProperty, PickType } from '@nestjs/swagger';
import { CreateCourseBody } from './courses.dto';
import { ParseCsvData } from 'src/files/files.dto';
import { CourseResponse } from 'src/prisma/prisma.responses';

export class CreateCourseRes extends CreateCourseBody {
  @ApiProperty()
  isCreated: boolean;
}

export class CreateCoursesRes extends ParseCsvData<CreateCourseBody> {
  @ApiProperty({ type: [CreateCourseRes] })
  courses: CreateCourseRes[];
}

export class CourseRes extends PickType(CourseResponse, [
  'id',
  'title',
  'code',
  'description',
  'semester',
  'units',
]) {
  @ApiProperty({ readOnly: true })
  department: string;
}
