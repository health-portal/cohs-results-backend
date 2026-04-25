import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { MessageQueueService } from 'src/message-queue/message-queue.service';
import { ApprovalStatus, DeptResultStatus, FileCategory, UserRole } from '@prisma/client';
import * as xlsx from 'xlsx';
import Papa from 'papaparse';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { FileRes } from './files.responses';
import { EmailSubject, ParseFilePayload, ProcessResultsPayload } from 'src/message-queue/message-queue.dto';
import { CreateStudentBody } from 'src/students/students.dto';
import { GradingSystemsService } from 'src/grading-systems/grading-systems.service';
import {
  FileErrorMessage,
  FileMetadata,
  ParseCsvData,
  ProvideAltHeaderMappingsBody,
  RowValidationError,
} from './files.dto';
import { CreateCourseRes, CreateCoursesRes } from 'src/courses/courses.responses';
import { CreateCourseBody } from 'src/courses/courses.dto';
import { CreateStudentsRes } from 'src/students/students.responses';
import {
  CreateLecturerRes,
  CreateLecturersRes,
  RegisterStudentsRes,
  UploadResultsRes,
} from 'src/lecturers/lecturers.responses';
import {
  CreateLecturerBody,
  RegisterStudentBody,
  UploadResultRow,
} from 'src/lecturers/lecturers.dto';
import { email } from 'envalid';
import axios from 'axios';

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
      include: {
        user: {
          select: {
            email: true,
          }
        }
      }
    });
    if (!file) {
      this.logger.warn(`File not found for fileId: ${fileId}`);
      return;
    }

    const metadata = (file.metadata as FileMetadata) ?? {};
    const summary = { total: 0, success: 0, failed: 0 };

    try {
      this.logger.log(
        `Normalizing file content for fileId: ${fileId}, category: ${file.category}`,
      );
      const csvContents = this.normalizeToCsv(
        Buffer.from(file.buffer),
        file.mimetype,
      );

      const responses: unknown[] = [];
      let result: any;

      for (const csvContent of csvContents) {
        switch (file.category) {
          case FileCategory.COURSES:
            result = this.logger.log(`Handling category: ${FileCategory.COURSES}`);
            responses.push(await this.handleCourses(csvContent, metadata));
            break;

          case FileCategory.LECTURERS:
            result = this.logger.log(`Handling category: ${FileCategory.LECTURERS}`);
            responses.push(await this.handleLecturers(csvContent, metadata));
            break;

          case FileCategory.STUDENTS:
            this.logger.log(`Handling category: ${FileCategory.STUDENTS}`);
            result = responses.push(await this.handleStudents(csvContent));
            break;

          case FileCategory.RESULTS:
            this.logger.log(`Handling category: ${FileCategory.RESULTS}`);
            result = responses.push(await this.handleResults(csvContent, metadata));
            break;

          case FileCategory.REGISTRATIONS:
            this.logger.log(`Handling category: ${FileCategory.REGISTRATIONS}`);
            result =  responses.push(
              await this.handleRegistrations(csvContent, metadata),
            );
            break;

          default:
            this.logger.error(`Invalid file category`);
            throw new Error(FileErrorMessage.INVALID_FILE_METADATA);
        }
      }
      if (result) {
        responses.push(result);
        summary.total += result.stats.total;
        summary.success += result.stats.success;
        summary.failed += result.stats.failed;
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
      await this.messageQueueService.enqueueNotificationEmail({
      subject: EmailSubject.RESULT_UPLOAD,
      email: file.user.email,
      title: "Uploaded file summary",
      message: `${summary.failed} out of ${summary.total} rows were riddled with errors. Please check the file again`
    });

    this.logger.log(`Processing complete. ${summary.success}/${summary.total} successful.`);
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

  private async handleCourses(csv: string, metadata: FileMetadata): Promise<CreateCoursesRes> {
    const headerMappings = await this.getHeaderMappings(FileCategory.COURSES);
    const parsed = this.parseCsv(csv, CreateCourseBody, headerMappings, metadata.altHeaderMappings);

    let successCount = 0;
    let failedCount = parsed.invalidRows.length;
    const courses: CreateCourseRes[] = [];

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
        successCount++;
        courses.push({ ...row, isCreated: true });
      } catch (error) {
        failedCount++;
        courses.push({ ...row, isCreated: false });
      }
    }

    return { ...parsed, courses, total: parsed.numberOfRows, success: successCount, failed: failedCount };
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

    
    let successCount = 0;
    let failedCount = parsed.invalidRows.length; 
    const lecturers: CreateLecturerRes[] = [];

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
          tokenPayload: { sub: user.id, email: user.email, role: user.role },
        });

        this.logger.log(`Lecturer created: ${row.email}`);
        successCount++;
        lecturers.push({ ...row, isCreated: true });
      } catch (error) {
        failedCount++;
        this.logger.error(`Failed to create lecturer ${row.email}: ${error.message}`);
        lecturers.push({ ...row, isCreated: false });
      }
    }

    
    return {
      ...parsed,
      lecturers,
      total: parsed.numberOfRows, 
      success: successCount,
      failed: failedCount,
    };
  }

  private async handleStudents(csv: string): Promise<CreateStudentsRes> {
    const headerMappings = await this.getHeaderMappings(FileCategory.STUDENTS);
    const parsed = this.parseCsv(csv, CreateStudentBody, headerMappings);

    let successCount = 0;
    let failedCount = parsed.invalidRows.length;
    const students : any[] = [];

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
          tokenPayload: { sub: user.id, email: user.email, role: user.role },
        });

        successCount++;
        students.push({ ...row, isCreated: true });
      } catch (error) {
        failedCount++;
        students.push({ ...row, isCreated: false });
      }
    }

    return { ...parsed, students, total: parsed.numberOfRows, success: successCount, failed: failedCount };
  }
    
  private async handleResults(csv: string, metadata: FileMetadata): Promise<UploadResultsRes> {
    if (!metadata.courseSessionId) throw new Error(FileErrorMessage.INVALID_FILE_METADATA);

    const headerMappings = await this.getHeaderMappings(FileCategory.RESULTS, metadata.courseSessionId);
    const parsed = this.parseCsv(csv, UploadResultRow, headerMappings);

    const courseSession = await this.prisma.courseSession.findUniqueOrThrow({
      where: { id: metadata.courseSessionId },
    });
    const gradingSystem = await this.prisma.gradingSystem.findUniqueOrThrow({
      where: { id: courseSession.gradingSystemId },
      select: { fields: true, ranges: true },
    });

    let successCount = 0;
    let failedCount = parsed.invalidRows.length;
    const studentsUploadedFor : any[] = [];
    const studentsNotFound: any[] = [];

    for (const row of parsed.validRows) {
      try {
        const student = await this.prisma.student.findUniqueOrThrow({
          where: { matricNumber: row.matricNumber },
          select: { id: true },
        });

        const enrollment = await this.prisma.enrollment.findUniqueOrThrow({
          where: { uniqueEnrollment: { studentId: student.id, courseSessionId: metadata.courseSessionId } },
        });

        await this.gradingSystemService.evaluateFromScores(enrollment.id, row.scores, gradingSystem);

        successCount++;
        studentsUploadedFor.push(row.matricNumber);
      } catch (error) {
        failedCount++;
        studentsNotFound.push(row.matricNumber);
      }
    }

    return { ...parsed, studentsUploadedFor, studentsNotFound, total: parsed.numberOfRows, success: successCount, failed: failedCount };
  }

  private async handleRegistrations(csv: string, metadata: FileMetadata): Promise<RegisterStudentsRes> {
    if (!metadata.courseSessionId) throw new Error(FileErrorMessage.INVALID_FILE_METADATA);

    const headerMappings = await this.getHeaderMappings(FileCategory.REGISTRATIONS);
    const parsed = this.parseCsv(csv, RegisterStudentBody, headerMappings, metadata.altHeaderMappings);

    let successCount = 0;
    let failedCount = parsed.invalidRows.length;
    const registeredStudents: string[] = [];
    const unregisteredStudents: string[] = [];

    for (const row of parsed.validRows) {
      try {
        const student = await this.prisma.student.findUnique({
          where: { matricNumber: row.matricNumber },
        });
        if (!student) throw new Error('Student not found');

        await this.prisma.enrollment.create({
          data: {
            studentId: student.id,
            levelAtEnrollment: student.level,
            courseSessionId: metadata.courseSessionId,
          },
        });

        successCount++;
        registeredStudents.push(row.matricNumber);
      } catch (error) {
        failedCount++;
        unregisteredStudents.push(row.matricNumber);
      }
    }

    return { ...parsed, registeredStudents, unregisteredStudents, total: parsed.numberOfRows, success: successCount, failed: failedCount };
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
      transformHeader: (h) => {
        const trimmedHeader = h.trim(); 
        return effectiveHeaders[trimmedHeader] ?? trimmedHeader;
      }
    });

    const validRows: T[] = [];
    const invalidRows: RowValidationError[] = [];

    parsed.data.forEach((row, index) => {
      // const instance = plainToInstance(cls, row);
      const { matricNumber, ...rest } = row as any;

      const formattedRow = {
        matricNumber,
        scores: { ...rest } 
      };
      const instance = plainToInstance(cls, formattedRow);
      const errors = validateSync(instance);

      if (errors.length) {
        this.logger.warn(
          `Row ${index + 1} failed validation: ${errors.length} errors`,
        );
        const details = errors.map(e => Object.values(e.constraints || {})).flat();
        this.logger.warn(
          `Row ${index + 1} failed validation: ${details.join(', ')}`,
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
        const courseSession = await this.prisma.courseSession.findUniqueOrThrow({
          where: { id: courseSessionId },
        });

        const fields = await this.prisma.gradingField.findMany({
          where: { gradingSystemId: courseSession.gradingSystemId },
        });

        const mappings: Record<string, string> = {
          'Matriculation Number': 'matricNumber',
        };
        fields.forEach((f) => {
          mappings[f.label] = f.variable;

          // Add these specific aliases to match the file headers in your log
          if (f.variable === 'CA') {
            mappings['continuousAssessment'] = 'CA';
          }
          if (f.variable === 'Exam') {
            mappings['examination'] = 'Exam';
          }
        });

        return mappings; 
      }
      default:
        this.logger.error(`Could not provide header mappings for category`);
        throw new Error(FileErrorMessage.INVALID_FILE_METADATA);
    }
  }

  
    async processResultUpload(payload: ProcessResultsPayload): Promise<void> {
      const { resultUploadId, courseSesnDeptLevelId} = payload;
  
      this.logger.log(`Processing ResultUpload ${resultUploadId}`);
  
      const resultUpload = await this.prisma.resultUpload.findUnique({
        where: { id: resultUploadId },
        include: {
          courseSesnDeptLevel: true,
          uploadedBy: {
            include: {
              user: {
                select: {
                  email: true 
                }
              }
            }
          },
          courseSession: {
            include: {
              gradingSystem: {
                include: {
                  fields: true,
                  ranges: { orderBy: { minScore: 'desc' } },
                },
              },
            },
          },
        },
      })
  
      if (!resultUpload) {
        throw new NotFoundException(`ResultUpload ${resultUploadId} not found`);
      }
  
      if (resultUpload.isProcessed) {
        this.logger.log(
          `ResultUpload ${resultUploadId} already processed — skipping`,
        );
        return;
      }
      
      const resultType = resultUpload.resultType;
  
      // Verify the approval flow for this dept+level is APPROVED
      const approvalFlow = await this.prisma.approvalFlow.findUnique({
        where: {
          courseSesnDeptLevelId,
          approvalStatus:     ApprovalStatus.APPROVED,
        },
      });
  
      if (!approvalFlow) {
        throw new Error(
          `Approval flow not yet approved for this dept/level — cannot process`,
        );
      }
  
      // Download file from Cloudinary
      const fileBuffer = await this.downloadFile(resultUpload.url);
      const metadata = (resultUpload.metadata as FileMetadata) ?? {};
  
      // Parse rows from Excel or CSV
      const csvContents = this.normalizeToCsv(
        Buffer.from(fileBuffer),
        resultUpload.mimetype,
      );
  
      if (!csvContents.length) {
        throw new Error(`Result file is empty or unreadable`);
      }
  
      // Resolve grading system
      const gradingSystem = resultUpload.courseSession.gradingSystem;
      const courseSessionId = resultUpload.courseSessionId;
  
      if (!gradingSystem) {
        throw new Error(
          `No grading system found for this course session `,
        );
      };
      let successCount = 0;
      let failedCount = 0;
      let totalRows = 0;
  
      for (const csvContent of csvContents) {

        const headerMappings = await this.getHeaderMappings(FileCategory.RESULTS, courseSessionId);
        const parsed = this.parseCsv(csvContent, UploadResultRow, headerMappings);
        // if (parsed.invalidRows.length > 0) {
        //   this.logger.warn(
        //     `Validation errors in ${resultUpload.filename}: ${JSON.stringify(parsed.invalidRows[0].errors)}`
        //   );
        // }
        failedCount += parsed.invalidRows.length;
        const studentsUploadedFor : any[] = [];
        const studentsNotFound: any[] = [];

        for (const row of parsed.validRows) {
          try {
            const student = await this.prisma.student.findUniqueOrThrow({
              where: { matricNumber: row.matricNumber },
              select: { id: true },
            });

            const enrollment = await this.prisma.enrollment.findUniqueOrThrow({
              where: { uniqueEnrollment: { studentId: student.id, courseSessionId } },
            });

            await this.gradingSystemService.evaluateFromScores(enrollment.id, row.scores, gradingSystem);
            successCount++;
            studentsUploadedFor.push(row.matricNumber);
          } catch (error) {
            failedCount++;
            this.logger.log(`Error occurred ${error.message}`);
            studentsNotFound.push(row.matricNumber);
          }
        }
      }
      

      totalRows = failedCount + successCount;
      this.logger.log(`File processing completed for file: ${resultUpload.filename}`);
      await this.messageQueueService.enqueueNotificationEmail({
      subject: EmailSubject.RESULT_UPLOAD,
      email: resultUpload.uploadedBy.user.email,
      title: "Uploaded file summary",
      message: `${failedCount} out of ${totalRows} rows were riddled with errors. Please check the file again`
    });

    const enrollments = await this.prisma.enrollment.findMany({
      where: { courseSessionId: courseSessionId },
      include: { 
      student: { include: { user: { select: { email: true } } } },
      courseSession: { include: { course: { select: {code: true} } }
      }
     }
    });
    
    for (const record of enrollments) {
      const email = record.student?.user?.email;
      const courseCode = record.courseSession.course.code;
      if (email) {
        await this.messageQueueService.enqueueNotificationEmail({
          subject: EmailSubject.RESULT_UPLOAD,
          email,
          title: 'New Grades Available',
          message: `The results for ${courseCode} have been published. Log in to your portal to view your statement of result.`,
        });
      }
    }


    this.logger.log(`Processing complete. ${successCount}/${totalRows} successful.`);
    
      await this.prisma.$transaction([
      this.prisma.resultUpload.update({
        where: { id: resultUpload.id },
        data: { isProcessed: true }
      }),
      this.prisma.courseSesnDeptAndLevel.update({
        where: { id: courseSesnDeptLevelId },
        data: {
          resultStatus: DeptResultStatus.PUBLISHED,
          publishedAt: new Date(),
        },
      })
    ]);
    }


    private async downloadFile(url: string): Promise<Buffer> {
      const response = await axios.get(url, { responseType: 'arraybuffer' });
      return Buffer.from(response.data);
    }
    
    
  async validateResultHeaders(file: Express.Multer.File, courseSessionId: string): Promise<void> {
    const csvString = file.buffer.toString();
    
    // Get the required variables from the database (e.g., ['CA', 'Exam'])
    const courseSession = await this.prisma.courseSession.findUniqueOrThrow({
      where: { id: courseSessionId },
      include: { gradingSystem: { include: { fields: true } } }
    });

    const requiredVariables = courseSession.gradingSystem.fields.map(f => f.variable);
    const headerMappings = await this.getHeaderMappings(FileCategory.RESULTS, courseSessionId);
    
    const result = Papa.parse(csvString, { preview: 1, header: false });
    const csvHeaders = result.data[0] as string[];
    
    const transformedHeaders = csvHeaders.map(h => headerMappings[h.trim()] || h.trim());

    const missingFields = requiredVariables.filter(v => !transformedHeaders.includes(v));

    if (missingFields.length > 0) {
      throw new BadRequestException(
        `Invalid CSV headers. Missing columns for: ${missingFields.join(', ')}. ` +
        `Ensure your headers match the expected mapping.`
      );
    }
    
    // Also check for Matriculation Number
    if (!transformedHeaders.includes('matricNumber')) {
      throw new BadRequestException("CSV is missing 'Matriculation Number' column.");
    }
  }

  async validateFileHeaders(
    file: Express.Multer.File,
    category: FileCategory,
    courseSessionId?: string,
  ): Promise<void> {
    const csvString = file.buffer.toString();
    const mappings = await this.getHeaderMappings(category, courseSessionId);
    
    // Parse just the first row
    const result = Papa.parse(csvString, { preview: 1, header: false });
    if (!result.data || result.data.length === 0) {
      throw new BadRequestException('The uploaded file is empty.');
    }

    const csvHeaders = (result.data[0] as string[]).map((h) => h.trim());
    const mappedHeaders = Object.keys(mappings);

    // Identify which required headers are missing from the CSV
    const missingHeaders = mappedHeaders.filter(
      (required) => !csvHeaders.includes(required)
    );

    if (missingHeaders.length > 0) {
      throw new BadRequestException(
        `Invalid CSV structure for ${category}. Missing columns: ${missingHeaders.join(', ')}`
      );
    }
  }




}

