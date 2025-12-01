import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { FileCategory, ResultType, UserRole } from '@prisma/client';
import { CreateCourseBody, CreateCoursesRes } from 'src/courses/courses.schema';
import {
  CreateLecturerBody,
  CreateLecturersRes,
  RegisterStudentBody,
  RegisterStudentsRes,
  UploadResultRow,
  UploadResultsRes,
} from 'src/lecturers/lecturers.schema';
import { parseCsv } from 'src/lib/csv';
import {
  EmailSubject,
  ParseFilePayload,
} from 'src/message-queue/message-queue.schema';
import { MessageQueueService } from 'src/message-queue/message-queue.service';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  CreateStudentBody,
  CreateStudentsRes,
} from 'src/students/students.schema';

@Injectable()
export class FilesService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => MessageQueueService))
    private readonly messageQueueService: MessageQueueService,
  ) {}

  async parseFile({ fileId, fileCategory, courseSessionId }: ParseFilePayload) {
    const foundFile = await this.prisma.file.findUnique({
      where: { id: fileId },
    });

    if (foundFile) {
      const content = foundFile.content.toString();
      switch (fileCategory) {
        case FileCategory.COURSES:
          await this.createCourses(content);
          break;
        case FileCategory.LECTURERS:
          await this.createLecturers(content);
          break;
        case FileCategory.STUDENTS:
          await this.createStudents(content);
          break;
        case FileCategory.REGISTRATIONS:
          await this.registerStudents(courseSessionId!, content);
          break;
        case FileCategory.RESULTS:
          await this.uploadResults(courseSessionId!, content);
          break;
      }
    }
  }

  async createCourses(content: string) {
    const parsedData = await parseCsv(content, CreateCourseBody);
    const result: CreateCoursesRes = { courses: [], ...parsedData };

    for (const row of parsedData.validRows) {
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
        result.courses.push({ ...row, isCreated: true });
      } catch {
        result.courses.push({ ...row, isCreated: false });
      }
    }

    return result;
  }

  async createLecturers(content: string) {
    const parsedData = await parseCsv(content, CreateLecturerBody);
    const result: CreateLecturersRes = { lecturers: [], ...parsedData };

    for (const row of parsedData.validRows) {
      try {
        const createdUser = await this.prisma.user.create({
          data: {
            email: row.email,
            role: UserRole.LECTURER,
            lecturer: {
              create: {
                firstName: row.firstName,
                lastName: row.lastName,
                otherName: row.otherName,
                department: { connect: { name: row.department } },
                phone: row.phone,
                title: row.title,
              },
            },
          },
        });

        await this.messageQueueService.enqueueEmail({
          isActivateAccount: true,
          tokenPayload: {
            email: createdUser.email,
            role: UserRole.LECTURER,
            sub: createdUser.id,
          },
        });

        result.lecturers.push({ ...row, isCreated: true });
      } catch {
        result.lecturers.push({ ...row, isCreated: false });
      }
    }

    return result;
  }

  async createStudents(content: string) {
    const parsedData = await parseCsv(content, CreateStudentBody);
    const result: CreateStudentsRes = { students: [], ...parsedData };

    for (const row of parsedData.validRows) {
      try {
        const createdUser = await this.prisma.user.create({
          data: {
            email: row.email,
            role: UserRole.STUDENT,
            student: {
              create: {
                firstName: row.firstName,
                lastName: row.lastName,
                otherName: row.otherName,
                matricNumber: row.matricNumber,
                department: { connect: { name: row.department } },
                admissionYear: row.admissionYear,
                degree: row.degree,
                gender: row.gender,
                level: row.level,
              },
            },
          },
        });

        await this.messageQueueService.enqueueEmail({
          isActivateAccount: true,
          tokenPayload: {
            email: createdUser.email,
            role: UserRole.LECTURER,
            sub: createdUser.id,
          },
        });

        result.students.push({ ...row, isCreated: true });
      } catch {
        result.students.push({ ...row, isCreated: false });
      }
    }

    return result;
  }

  async registerStudents(courseSessionId: string, content: string) {
    const parsedData = await parseCsv(content, RegisterStudentBody);
    const result: RegisterStudentsRes = {
      ...parsedData,
      registeredStudents: [],
      unregisteredStudents: [],
    };

    for (const { matricNumber } of parsedData.validRows) {
      try {
        await this.prisma.courseSession.update({
          where: { id: courseSessionId },
          data: {
            enrollments: { create: { student: { connect: { matricNumber } } } },
          },
        });
        result.registeredStudents.push(matricNumber);
      } catch {
        result.unregisteredStudents.push(matricNumber);
      }
    }

    return result;
  }

  async uploadResults(courseSessionId: string, content: string) {
    const parsedData = await parseCsv(content, UploadResultRow);
    const result: UploadResultsRes = {
      ...parsedData,
      studentsUploadedFor: [],
      studentsNotFound: [],
    };

    for (const { matricNumber, scores } of parsedData.validRows) {
      try {
        const foundStudent = await this.prisma.student.findUniqueOrThrow({
          where: { matricNumber },
          select: { id: true, user: true },
        });
        await this.prisma.enrollment.update({
          where: {
            uniqueEnrollment: { courseSessionId, studentId: foundStudent.id },
          },
          data: { results: { create: { scores, type: ResultType.INITIAL } } },
        });

        await this.messageQueueService.enqueueEmail({
          subject: EmailSubject.RESULT_UPLOAD,
          email: foundStudent.user.email,
          message: `Your result has been uploaded for the course session ${courseSessionId}.`,
          title: EmailSubject.RESULT_UPLOAD,
        });

        result.studentsUploadedFor.push(matricNumber);
      } catch {
        result.studentsNotFound.push(matricNumber);
      }
    }

    return result;
  }
}
