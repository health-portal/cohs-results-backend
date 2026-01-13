import { ForbiddenException, Injectable } from '@nestjs/common';
import {
  RegisterStudentBody,
  EditResultBody,
  EnrollmentRes,
  LecturerProfileRes,
} from './lecturers.schema';
import { PrismaService } from 'src/prisma/prisma.service';
import { FileCategory, ResultType } from '@prisma/client';
import { MessageQueueService } from 'src/message-queue/message-queue.service';
import { CourseSessionRes } from 'src/sessions/sessions.schema';

@Injectable()
export class LecturerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly messageQueueService: MessageQueueService,
  ) {}

  private async validateCourseLecturerAccess(
    lecturerId: string,
    courseSessionId: string,
    isCoordinator: boolean = false,
  ) {
    const foundCourseLecturer = await this.prisma.courseLecturer.findUnique({
      where: {
        uniqueCourseSessionLecturer: { courseSessionId, lecturerId },
        isCoordinator: isCoordinator ? true : undefined,
      },
    });

    if (!foundCourseLecturer)
      throw new ForbiddenException(
        'You are not authorized to register students in this course session.',
      );
  }

  async listCourseSessions(lecturerId: string): Promise<CourseSessionRes[]> {
    return await this.prisma.courseSession.findMany({
      where: { lecturers: { some: { id: lecturerId } } },
      select: {
        id: true,
        createdAt: true,
        updatedAt: true,
        courseId: true,
        sessionId: true,
        gradingSystemId: true,
      },
    });
  }

  async registerStudent(
    lecturerId: string,
    courseSessionId: string,
    { matricNumber }: RegisterStudentBody,
  ) {
    await this.validateCourseLecturerAccess(lecturerId, courseSessionId, true);
    await this.prisma.courseSession.update({
      where: { id: courseSessionId },
      data: {
        enrollments: { create: { student: { connect: { matricNumber } } } },
      },
    });
  }

  async uploadFileForStudentRegistrations(
    userId: string,
    lecturerId: string,
    courseSessionId: string,
    file: Express.Multer.File,
  ) {
    await this.validateCourseLecturerAccess(lecturerId, userId, true);
    const createdFile = await this.prisma.file.create({
      data: {
        filename: file.originalname,
        buffer: Buffer.from(file.buffer),
        userId,
        category: FileCategory.REGISTRATIONS,
        mimetype: file.mimetype,
        metadata: { courseSessionId },
      },
    });

    await this.messageQueueService.enqueueFile({
      fileId: createdFile.id,
    });
  }

  async uploadFileForStudentResults(
    userId: string,
    lecturerId: string,
    courseSessionId: string,
    file: Express.Multer.File,
  ) {
    await this.validateCourseLecturerAccess(lecturerId, userId, true);
    const createdFile = await this.prisma.file.create({
      data: {
        filename: file.originalname,
        buffer: Buffer.from(file.buffer),
        userId,
        category: FileCategory.RESULTS,
        mimetype: file.mimetype,
        metadata: { courseSessionId },
      },
    });

    await this.messageQueueService.enqueueFile({
      fileId: createdFile.id,
    });
  }

  async editResult(
    lecturerId: string,
    courseSessionId: string,
    studentId: string,
    { scores }: EditResultBody,
  ) {
    await this.validateCourseLecturerAccess(lecturerId, courseSessionId, true);
    await this.prisma.enrollment.update({
      where: { uniqueEnrollment: { courseSessionId, studentId } },
      data: { results: { create: { scores, type: ResultType.INITIAL } } },
    });
  }

  async viewCourseResults(
    lecturerId: string,
    courseSessionId: string,
  ): Promise<EnrollmentRes[]> {
    await this.validateCourseLecturerAccess(lecturerId, courseSessionId);
    const foundEnrollments = await this.prisma.enrollment.findMany({
      where: { courseSessionId },
      select: {
        id: true,
        status: true,
        student: {
          select: {
            id: true,
            matricNumber: true,
            firstName: true,
            lastName: true,
            otherName: true,
            level: true,
            department: { select: { name: true } },
          },
        },
        results: { select: { type: true, scores: true } },
      },
    });

    return foundEnrollments.map((enrollment) => ({
      id: enrollment.id,
      status: enrollment.status,
      studentId: enrollment.student.id,
      studentName:
        `${enrollment.student.lastName} ${enrollment.student.firstName} ${enrollment.student.otherName}`.trim(),
      studentLevel: enrollment.student.level,
      studentDepartment: enrollment.student.department.name,
      results: enrollment.results.map((result) => ({
        scores: result.scores as object,
        type: result.type,
      })),
    }));
  }

  async listCourseStudents(
    lecturerId: string,
    courseSessionId: string,
  ): Promise<EnrollmentRes[]> {
    await this.validateCourseLecturerAccess(lecturerId, courseSessionId);
    const foundEnrollments = await this.prisma.enrollment.findMany({
      where: { courseSessionId },
      select: {
        id: true,
        status: true,
        student: {
          select: {
            id: true,
            matricNumber: true,
            firstName: true,
            lastName: true,
            otherName: true,
            level: true,
            department: { select: { name: true } },
          },
        },
      },
    });

    return foundEnrollments.map((enrollment) => ({
      id: enrollment.id,
      status: enrollment.status,
      studentId: enrollment.student.id,
      studentName:
        `${enrollment.student.lastName} ${enrollment.student.firstName} ${enrollment.student.otherName}`.trim(),
      studentLevel: enrollment.student.level,
      studentDepartment: enrollment.student.department.name,
      results: null,
    }));
  }

  async getProfile(lecturerId: string): Promise<LecturerProfileRes> {
    const foundLecturer = await this.prisma.lecturer.findUniqueOrThrow({
      where: { id: lecturerId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        otherName: true,
        title: true,
        phone: true,
        qualification: true,
        department: { select: { name: true } },
        user: { select: { email: true } },
      },
    });

    return {
      id: foundLecturer.id,
      firstName: foundLecturer.firstName,
      lastName: foundLecturer.lastName,
      otherName: foundLecturer.otherName,
      phone: foundLecturer.phone,
      title: foundLecturer.title,
      qualification: foundLecturer.qualification,
      department: foundLecturer.department.name,
      email: foundLecturer.user.email,
    };
  }
}
