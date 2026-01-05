import {
  forwardRef,
  Inject,
  Injectable,
  Logger,
  UnprocessableEntityException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { MessageQueueService } from 'src/message-queue/message-queue.service';
import { FileCategory, ResultType, UserRole } from '@prisma/client';
import * as xlsx from 'xlsx';
import Papa from 'papaparse';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import {
  FileErrorMessage,
  FileMetadata,
  ParseCsvData,
  RowValidationError,
} from './files.schema';
import { ParseFilePayload } from 'src/message-queue/message-queue.schema';
import { CreateCourseBody, CreateCoursesRes } from 'src/courses/courses.schema';
import {
  CreateLecturerBody,
  CreateLecturersRes,
  RegisterStudentBody,
  RegisterStudentsRes,
  UploadResultRow,
  UploadResultsRes,
} from 'src/lecturers/lecturers.schema';
import {
  CreateStudentBody,
  CreateStudentsRes,
} from 'src/students/students.schema';

@Injectable()
export class FilesService {
  private readonly logger = new Logger(FilesService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => MessageQueueService))
    private readonly messageQueueService: MessageQueueService,
  ) {}

  async getFiles(userId: string) {
    return this.prisma.file.findMany({ where: { userId } });
  }

  async parseFile(payload: ParseFilePayload) {
    const { fileId } = payload;

    const foundFile = await this.prisma.file.findUnique({
      where: { id: fileId },
    });
    if (!foundFile) return;

    const metadata = (foundFile.metadata as FileMetadata) ?? {};

    try {
      const csvContents = this.normalizeToCsv(
        Buffer.from(foundFile.buffer),
        foundFile.mimetype,
      );

      const responses: unknown[] = [];

      for (const csvContent of csvContents) {
        switch (foundFile.category) {
          case FileCategory.COURSES:
            responses.push(await this.handleCourses(csvContent, metadata));
            break;

          case FileCategory.LECTURERS:
            responses.push(await this.handleLecturers(csvContent, metadata));
            break;

          case FileCategory.STUDENTS:
            responses.push(await this.handleStudents(csvContent));
            break;

          case FileCategory.RESULTS:
            responses.push(await this.handleResults(csvContent, metadata));
            break;

          case FileCategory.REGISTRATIONS:
            responses.push(
              await this.handleRegistrations(csvContent, metadata),
            );
            break;

          default:
            throw new Error(FileErrorMessage.INVALID_FILE_METADATA);
        }
      }

      await this.prisma.file.update({
        where: { id: foundFile.id },
        data: {
          isProcessed: true,
          metadata: JSON.stringify({
            ...metadata,
            responses,
          }),
        },
      });
    } catch (error) {
      await this.prisma.file.update({
        where: { id: foundFile.id },
        data: {
          metadata: JSON.stringify({
            ...metadata,
            error: error.message,
          }),
        },
      });
    }
  }

  private async handleCourses(
    csv: string,
    metadata: FileMetadata,
  ): Promise<CreateCoursesRes> {
    const headerMappings = await this.getHeaderMappings(FileCategory.COURSES);

    const parsed = this.parseCsv(
      csv,
      CreateCourseBody,
      headerMappings,
      metadata.altHeaderMappings,
    );

    const res: CreateCoursesRes = { courses: [], ...parsed };

    for (const row of parsed.validRows) {
      try {
        await this.prisma.course.create({
          data: {
            code: row.code,
            title: row.title,
            description: row.description,
            department: { connect: { name: row.department } },
            semester: row.semester,
            units: row.units,
          },
        });
        res.courses.push({ ...row, isCreated: true });
      } catch {
        res.courses.push({ ...row, isCreated: false });
      }
    }

    return res;
  }

  private async handleLecturers(
    csv: string,
    metadata: FileMetadata,
  ): Promise<CreateLecturersRes> {
    const headerMappings = await this.getHeaderMappings(FileCategory.LECTURERS);

    const parsed = this.parseCsv(
      csv,
      CreateLecturerBody,
      headerMappings,
      metadata.altHeaderMappings,
    );

    const res: CreateLecturersRes = { lecturers: [], ...parsed };

    for (const row of parsed.validRows) {
      try {
        const user = await this.prisma.user.create({
          data: {
            email: row.email,
            role: UserRole.LECTURER,
            lecturer: {
              create: {
                firstName: row.firstName,
                lastName: row.lastName,
                otherName: row.otherName,
                phone: row.phone,
                title: row.title,
                department: { connect: { name: row.department } },
              },
            },
          },
        });

        await this.messageQueueService.enqueueSetPasswordEmail({
          isActivateAccount: true,
          tokenPayload: {
            sub: user.id,
            email: user.email,
            role: user.role,
          },
        });

        res.lecturers.push({ ...row, isCreated: true });
      } catch {
        res.lecturers.push({ ...row, isCreated: false });
      }
    }

    return res;
  }

  private async handleStudents(csv: string): Promise<CreateStudentsRes> {
    const headerMappings = await this.getHeaderMappings(FileCategory.STUDENTS);

    const parsed = this.parseCsv(csv, CreateStudentBody, headerMappings);

    const res: CreateStudentsRes = { students: [], ...parsed };

    for (const row of parsed.validRows) {
      try {
        const user = await this.prisma.user.create({
          data: {
            email: row.email,
            role: UserRole.STUDENT,
            student: {
              create: {
                firstName: row.firstName,
                lastName: row.lastName,
                otherName: row.otherName,
                matricNumber: row.matricNumber,
                admissionYear: row.admissionYear,
                department: { connect: { name: row.department } },
                degree: row.degree,
                level: row.level,
                gender: row.gender,
              },
            },
          },
        });

        await this.messageQueueService.enqueueSetPasswordEmail({
          isActivateAccount: true,
          tokenPayload: {
            sub: user.id,
            email: user.email,
            role: user.role,
          },
        });

        res.students.push({ ...row, isCreated: true });
      } catch {
        res.students.push({ ...row, isCreated: false });
      }
    }

    return res;
  }

  private async handleResults(
    csv: string,
    metadata: FileMetadata,
  ): Promise<UploadResultsRes> {
    if (!metadata.courseSessionId)
      throw new Error(FileErrorMessage.INVALID_FILE_METADATA);

    const headerMappings = await this.getHeaderMappings(
      FileCategory.RESULTS,
      metadata.courseSessionId,
    );

    const parsed = this.parseCsv(csv, UploadResultRow, headerMappings);

    const res: UploadResultsRes = {
      studentsUploadedFor: [],
      studentsNotFound: [],
      ...parsed,
    };

    for (const row of parsed.validRows) {
      try {
        const student = await this.prisma.student.findUniqueOrThrow({
          where: { matricNumber: row.matricNumber },
          select: { id: true, user: true },
        });

        await this.prisma.enrollment.update({
          where: {
            uniqueEnrollment: {
              studentId: student.id,
              courseSessionId: metadata.courseSessionId,
            },
          },
          data: {
            results: {
              create: {
                scores: row.scores,
                type: ResultType.INITIAL,
              },
            },
          },
        });

        res.studentsUploadedFor.push(row.matricNumber);
      } catch {
        res.studentsNotFound.push(row.matricNumber);
      }
    }

    return res;
  }

  private async handleRegistrations(
    csv: string,
    metadata: FileMetadata,
  ): Promise<RegisterStudentsRes> {
    if (!metadata.courseSessionId)
      throw new Error(FileErrorMessage.INVALID_FILE_METADATA);

    const headerMappings = await this.getHeaderMappings(
      FileCategory.REGISTRATIONS,
    );

    const parsed = this.parseCsv(
      csv,
      RegisterStudentBody,
      headerMappings,
      metadata.altHeaderMappings,
    );

    const res: RegisterStudentsRes = {
      registeredStudents: [],
      unregisteredStudents: [],
      ...parsed,
    };

    for (const row of parsed.validRows) {
      try {
        await this.prisma.courseSession.update({
          where: { id: metadata.courseSessionId },
          data: {
            enrollments: {
              create: {
                student: {
                  connect: { matricNumber: row.matricNumber },
                },
              },
            },
          },
        });

        res.registeredStudents.push(row.matricNumber);
      } catch {
        res.unregisteredStudents.push(row.matricNumber);
      }
    }

    return res;
  }

  private normalizeToCsv(buffer: Buffer, mimetype: string): string[] {
    if (mimetype.includes('csv') || mimetype === 'text/plain') {
      return [buffer.toString('utf-8')];
    }

    if (mimetype.includes('excel') || mimetype.includes('spreadsheet')) {
      const workbook = xlsx.read(buffer, { type: 'buffer' });
      return workbook.SheetNames.map((name) =>
        xlsx.utils.sheet_to_csv(workbook.Sheets[name]),
      );
    }

    throw new UnprocessableEntityException(FileErrorMessage.INVALID_FILE_TYPE);
  }

  private parseCsv<T extends object>(
    csv: string,
    cls: new () => T,
    headerMappings: Record<string, string>,
    altHeaderMappings?: Record<string, string>,
  ): ParseCsvData<T> {
    const effectiveHeaders = altHeaderMappings ?? headerMappings;

    const parsed = Papa.parse(csv, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => effectiveHeaders[h] ?? h,
    });

    const validRows: T[] = [];
    const invalidRows: RowValidationError[] = [];

    parsed.data.forEach((row, index) => {
      const instance = plainToInstance(cls, row);
      const errors = validateSync(instance);

      if (errors.length) {
        invalidRows.push({
          row: index + 1,
          errorMessages: errors.map((e) => e.toString()),
        });
      } else {
        validRows.push(instance);
      }
    });

    return {
      numberOfRows: parsed.data.length,
      validRows,
      invalidRows,
    };
  }

  async getHeaderMappings(
    category: FileCategory,
    courseSessionId?: string,
  ): Promise<Record<string, string>> {
    switch (category) {
      case FileCategory.COURSES:
        return {
          'Course Code': 'code',
          'Course Title': 'title',
          'Course Description': 'description',
          Department: 'department',
          Semester: 'semester',
          Units: 'units',
        };

      case FileCategory.LECTURERS:
        return {
          'First Name': 'firstName',
          'Last Name': 'lastName',
          'Other Name': 'otherName',
          Email: 'email',
          Phone: 'phone',
          Department: 'department',
          Title: 'title',
        };

      case FileCategory.STUDENTS:
        return {
          'First Name': 'firstName',
          'Last Name': 'lastName',
          'Other Name': 'otherName',
          Email: 'email',
          'Matriculation Number': 'matricNumber',
          Department: 'department',
          Degree: 'degree',
          Level: 'level',
          'Admission Year': 'admissionYear',
          Gender: 'gender',
        };

      case FileCategory.REGISTRATIONS:
        return {
          'Matriculation Number': 'matricNumber',
        };

      case FileCategory.RESULTS: {
        const cs = await this.prisma.courseSession.findUniqueOrThrow({
          where: { id: courseSessionId },
        });

        const fields = await this.prisma.gradingField.findMany({
          where: { gradingSystemId: cs.gradingSystemId },
        });

        return Object.fromEntries(fields.map((f) => [f.label, f.variable]));
      }

      default:
        throw new Error(FileErrorMessage.INVALID_FILE_METADATA);
    }
  }
}
