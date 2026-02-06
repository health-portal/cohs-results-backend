import {
  forwardRef,
  Inject,
  Injectable,
  Logger,
  UnprocessableEntityException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { MessageQueueService } from 'src/message-queue/message-queue.service';
import { FileCategory, UserRole } from '@prisma/client';
import * as xlsx from 'xlsx';
import Papa from 'papaparse';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { FileRes } from './files.responses';
import { ParseFilePayload } from 'src/message-queue/message-queue.dto';
import { CreateStudentBody } from 'src/students/students.dto';
import { GradingSystemsService } from 'src/grading-systems/grading-systems.service';
import {
  FileErrorMessage,
  FileMetadata,
  ParseCsvData,
  ProvideAltHeaderMappingsBody,
  RowValidationError,
} from './files.dto';
import { CreateCoursesRes } from 'src/courses/courses.responses';
import { CreateCourseBody } from 'src/courses/courses.dto';
import { CreateStudentsRes } from 'src/students/students.responses';
import {
  CreateLecturersRes,
  RegisterStudentsRes,
  UploadResultsRes,
} from 'src/lecturers/lecturers.responses';
import {
  CreateLecturerBody,
  RegisterStudentBody,
  UploadResultRow,
} from 'src/lecturers/lecturers.dto';

@Injectable()
export class FilesService {
  private readonly logger = new Logger(FilesService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => MessageQueueService))
    private readonly messageQueueService: MessageQueueService,
    private readonly gradingSystemService: GradingSystemsService,
  ) {}

  async getFiles(userId: string): Promise<FileRes[]> {
    this.logger.log(`Fetching files for user: ${userId}`);
    const files = await this.prisma.file.findMany({
      where: { userId },
      select: {
        id: true,
        filename: true,
        createdAt: true,
        description: true,
        mimetype: true,
        metadata: true,
        category: true,
        isProcessed: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    this.logger.log(`Found ${files.length} files for user: ${userId}`);
    return files.map((file) => ({
      ...file,
      metadata: file.metadata as object,
    }));
  }

  async provideAltHeaderMappings(
    userId: string,
    fileId: string,
    body: ProvideAltHeaderMappingsBody,
  ) {
    this.logger.log(
      `Updating alt header mappings for file: ${fileId}, user: ${userId}`,
    );
    const file = await this.prisma.file.findUniqueOrThrow({
      where: { id: fileId, userId },
    });

    await this.prisma.file.update({
      where: { id: fileId, userId },
      data: {
        metadata: JSON.stringify({
          altHeaderMappings: body.altHeaderMappings,
          ...(file.metadata as FileMetadata),
        }),
      },
    });
    this.logger.log(
      `Alt header mappings updated successfully for file: ${fileId}`,
    );
  }

  async parseFile(payload: ParseFilePayload) {
    const { fileId } = payload;
    this.logger.log(`Starting file parsing for fileId: ${fileId}`);

    const file = await this.prisma.file.findUnique({
      where: { id: fileId },
    });
    if (!file) {
      this.logger.warn(`File not found for fileId: ${fileId}`);
      return;
    }

    const metadata = (file.metadata as FileMetadata) ?? {};

    try {
      this.logger.log(
        `Normalizing file content for fileId: ${fileId}, category: ${file.category}`,
      );
      const csvContents = this.normalizeToCsv(
        Buffer.from(file.buffer),
        file.mimetype,
      );

      const responses: unknown[] = [];

      for (const csvContent of csvContents) {
        switch (file.category) {
          case FileCategory.COURSES:
            this.logger.log(`Handling category: ${FileCategory.COURSES}`);
            responses.push(await this.handleCourses(csvContent, metadata));
            break;

          case FileCategory.LECTURERS:
            this.logger.log(`Handling category: ${FileCategory.LECTURERS}`);
            responses.push(await this.handleLecturers(csvContent, metadata));
            break;

          case FileCategory.STUDENTS:
            this.logger.log(`Handling category: ${FileCategory.STUDENTS}`);
            responses.push(await this.handleStudents(csvContent));
            break;

          case FileCategory.RESULTS:
            this.logger.log(`Handling category: ${FileCategory.RESULTS}`);
            responses.push(await this.handleResults(csvContent, metadata));
            break;

          case FileCategory.REGISTRATIONS:
            this.logger.log(`Handling category: ${FileCategory.REGISTRATIONS}`);
            responses.push(
              await this.handleRegistrations(csvContent, metadata),
            );
            break;

          default:
            this.logger.error(`Invalid file category`);
            throw new Error(FileErrorMessage.INVALID_FILE_METADATA);
        }
      }

      await this.prisma.file.update({
        where: { id: file.id },
        data: {
          isProcessed: true,
          metadata: JSON.stringify({
            ...metadata,
            responses,
          }),
        },
      });
      this.logger.log(`File processing completed for fileId: ${fileId}`);
    } catch (error) {
      this.logger.error(`Failed to parse file ${fileId}: ${error.message}`);
      await this.prisma.file.update({
        where: { id: file.id },
        data: {
          metadata: JSON.stringify({
            ...metadata,
            error: error.message as string,
          }),
        },
      });
    }
  }

  private async handleCourses(
    csv: string,
    metadata: FileMetadata,
  ): Promise<CreateCoursesRes> {
    this.logger.log('Processing courses handle');
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
        this.logger.log(`Course created: ${row.code}`);
        res.courses.push({ ...row, isCreated: true });
      } catch (error) {
        this.logger.error(
          `Failed to create course ${row.code}: ${error.message}`,
        );
        res.courses.push({ ...row, isCreated: false });
      }
    }

    return res;
  }

  private async handleLecturers(
    csv: string,
    metadata: FileMetadata,
  ): Promise<CreateLecturersRes> {
    this.logger.log('Processing lecturers handle');
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
                gender: row.gender,
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

        this.logger.log(`Lecturer created: ${row.email}`);
        res.lecturers.push({ ...row, isCreated: true });
      } catch (error) {
        this.logger.error(
          `Failed to create lecturer ${row.email}: ${error.message}`,
        );
        res.lecturers.push({ ...row, isCreated: false });
      }
    }

    return res;
  }

  private async handleStudents(csv: string): Promise<CreateStudentsRes> {
    this.logger.log('Processing students handle');
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

        this.logger.log(`Student created: ${row.email} (${row.matricNumber})`);
        res.students.push({ ...row, isCreated: true });
      } catch (error) {
        this.logger.error(
          `Failed to create student ${row.email}: ${error.message}`,
        );
        res.students.push({ ...row, isCreated: false });
      }
    }

    return res;
  }

  private async handleResults(
    csv: string,
    metadata: FileMetadata,
  ): Promise<UploadResultsRes> {
    this.logger.log(
      `Processing results handle for courseSession: ${metadata.courseSessionId}`,
    );
    if (!metadata.courseSessionId) {
      this.logger.error(
        'Missing courseSessionId in metadata for results handle',
      );
      throw new Error(FileErrorMessage.INVALID_FILE_METADATA);
    }

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

    const courseSession = await this.prisma.courseSession.findUniqueOrThrow({
      where: { id: metadata.courseSessionId },
    });
    const gradingSystem = await this.prisma.gradingSystem.findUniqueOrThrow({
      where: { id: courseSession.gradingSystemId },
      select: {
        fields: true,
        ranges: true,
      },
    });

    for (const row of parsed.validRows) {
      try {
        const student = await this.prisma.student.findUniqueOrThrow({
          where: { matricNumber: row.matricNumber },
          select: { id: true, user: true },
        });

        const enrollment = await this.prisma.enrollment.findUniqueOrThrow({
          where: {
            uniqueEnrollment: {
              studentId: student.id,
              courseSessionId: metadata.courseSessionId,
            },
          },
        });
        await this.gradingSystemService.evaluateFromScores(
          enrollment.id,
          row.scores,
          gradingSystem,
        );

        this.logger.log(`Results uploaded for student: ${row.matricNumber}`);
        res.studentsUploadedFor.push(row.matricNumber);
      } catch (error) {
        this.logger.error(
          `Failed to upload results for student ${row.matricNumber}: ${error.message}`,
        );
        res.studentsNotFound.push(row.matricNumber);
      }
    }

    return res;
  }

  private async handleRegistrations(
    csv: string,
    metadata: FileMetadata,
  ): Promise<RegisterStudentsRes> {
    this.logger.log(
      `Processing registrations handle for courseSession: ${metadata.courseSessionId}`,
    );
    if (!metadata.courseSessionId) {
      this.logger.error(
        'Missing courseSessionId in metadata for registrations handle',
      );
      throw new Error(FileErrorMessage.INVALID_FILE_METADATA);
    }

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
        const student = await this.prisma.student.findUnique({
          where: { matricNumber: row.matricNumber },
        });
        if (!student) {
          throw new Error('Student not found');
        }

        await this.prisma.enrollment.create({
          data: {
            studentId: student.id,
            levelAtEnrollment: student.level,
            courseSessionId: metadata.courseSessionId,
          },
        });

        this.logger.log(`Student registered: ${row.matricNumber}`);
        res.registeredStudents.push(row.matricNumber);
      } catch (error) {
        this.logger.error(
          `Failed to register student ${row.matricNumber}: ${error.message}`,
        );
        res.unregisteredStudents.push(row.matricNumber);
      }
    }

    return res;
  }

  private normalizeToCsv(buffer: Buffer, mimetype: string): string[] {
    this.logger.log(`Normalizing content with mimetype: ${mimetype}`);
    if (mimetype.includes('csv') || mimetype === 'text/plain') {
      return [buffer.toString('utf-8')];
    }

    if (mimetype.includes('excel') || mimetype.includes('spreadsheet')) {
      const workbook = xlsx.read(buffer, { type: 'buffer' });
      this.logger.log(
        `Excel workbook read with ${workbook.SheetNames.length} sheets`,
      );
      return workbook.SheetNames.map((name) =>
        xlsx.utils.sheet_to_csv(workbook.Sheets[name]),
      );
    }

    this.logger.error(`Unsupported mimetype: ${mimetype}`);
    throw new UnprocessableEntityException(FileErrorMessage.INVALID_FILE_TYPE);
  }

  private parseCsv<T extends object>(
    csv: string,
    cls: new () => T,
    headerMappings: Record<string, string>,
    altHeaderMappings?: Record<string, string>,
  ): ParseCsvData<T> {
    const effectiveHeaders = altHeaderMappings ?? headerMappings;
    this.logger.log('Starting PapaParse operation');

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
        this.logger.warn(
          `Row ${index + 1} failed validation: ${errors.length} errors`,
        );
        invalidRows.push({
          row: index + 1,
          errorMessages: errors.map((e) => e.toString()),
        });
      } else {
        validRows.push(instance);
      }
    });

    this.logger.log(
      `Parsing finished. Valid: ${validRows.length}, Invalid: ${invalidRows.length}`,
    );
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
    this.logger.log(`Fetching header mappings for category: ${category}`);
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
          Gender: 'gender',
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
        this.logger.log(
          `Fetching dynamic grading fields for session: ${courseSessionId}`,
        );
        const courseSession = await this.prisma.courseSession.findUniqueOrThrow(
          {
            where: { id: courseSessionId },
          },
        );

        const fields = await this.prisma.gradingField.findMany({
          where: { gradingSystemId: courseSession.gradingSystemId },
        });
        return Object.fromEntries(fields.map((f) => [f.label, f.variable]));
      }

      default:
        this.logger.error(`Could not provide header mappings for category`);
        throw new Error(FileErrorMessage.INVALID_FILE_METADATA);
    }
  }
}
