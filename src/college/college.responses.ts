import { ApiProperty, PickType } from '@nestjs/swagger';
import {
  DepartmentResponse,
  FacultyResponse,
} from 'src/prisma/prisma.responses';

export class FacultyRes extends PickType(FacultyResponse, ['id', 'name']) {}

export class DepartmentRes extends PickType(DepartmentResponse, [
  'id',
  'name',
  'shortName',
  'maxLevel',
]) {
  @ApiProperty({ type: FacultyRes })
  faculty: FacultyRes;
}
