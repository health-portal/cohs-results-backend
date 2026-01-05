import { ApiProperty } from '@nestjs/swagger';
import { FileCategory } from '@prisma/client';
import { CreateCoursesRes } from 'src/courses/courses.schema';
import {
  CreateLecturersRes,
  RegisterStudentsRes,
  UploadResultsRes,
} from 'src/lecturers/lecturers.schema';
import { CreateStudentRes } from 'src/students/students.schema';

export enum FileErrorMessage {
  INVALID_HEADERS = 'Invalid headers',
  INVALID_FILE_TYPE = 'Invalid file type',
  INVALID_FILE_CONTENT = 'Invalid file content',
  INVALID_FILE_METADATA = 'Invalid file metadata',
  INVALID_FILE_USER = 'Invalid file user',
  INVALID_FILE_ID = 'Invalid file id',
}

export interface FileMetadata {
  courseSessionId?: string;
  altHeaderMappings?: Record<string, string>;
  error?: FileErrorMessage;
  response?:
    | CreateCoursesRes
    | RegisterStudentsRes
    | UploadResultsRes
    | CreateStudentRes
    | CreateLecturersRes;
}

export class RowValidationError {
  @ApiProperty()
  row: number;

  @ApiProperty({ type: [String] })
  errorMessages: string[];
}

export class ParseCsvData<T extends object> {
  @ApiProperty()
  numberOfRows: number;

  @ApiProperty({ type: [Object] })
  validRows: T[];

  @ApiProperty({ type: [RowValidationError] })
  invalidRows: RowValidationError[];
}

export class ProvideAltHeaderMappingsBody {
  @ApiProperty({ type: [Object] })
  altHeaderMappings: Record<string, string>;
}

export class FileRes {
  @ApiProperty({ nullable: true })
  description: string | null;

  @ApiProperty({ nullable: true })
  buffer: Buffer | null;

  @ApiProperty({ nullable: true })
  mimetype: string | null;

  @ApiProperty({ enum: FileCategory, nullable: true })
  category: FileCategory | null;

  @ApiProperty({ nullable: true })
  metadata: object | null;

  @ApiProperty({ nullable: true })
  userId: string | null;

  @ApiProperty({ nullable: true })
  id: string | null;

  @ApiProperty({ nullable: true })
  createdAt: Date | null;

  @ApiProperty({ nullable: true })
  updatedAt: Date | null;

  @ApiProperty({ nullable: true })
  deletedAt: Date | null;

  @ApiProperty({ nullable: true })
  filename: string | null;
}
