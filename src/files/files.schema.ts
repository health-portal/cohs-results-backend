import { ApiProperty } from '@nestjs/swagger';
import { FileCategory, FileStatus } from '@prisma/client';

export class RowValidationError {
  @ApiProperty()
  row: number;

  @ApiProperty()
  errorMessage: string;
}

export class ParseCsvData<T extends object> {
  @ApiProperty()
  numberOfRows: number;

  @ApiProperty({ type: [Object] })
  validRows: T[];

  @ApiProperty({ type: [RowValidationError] })
  invalidRows: RowValidationError[];
}

export class FileRes {
  @ApiProperty({ nullable: true })
  description: string | null;

  @ApiProperty({ nullable: true })
  buffer: Buffer | null;

  @ApiProperty({ nullable: true })
  mimetype: string | null;

  @ApiProperty({ enum: FileStatus, nullable: true })
  status: FileStatus | null;

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
