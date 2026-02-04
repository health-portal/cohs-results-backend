import { ForbiddenException, Injectable } from '@nestjs/common';
import { RegisterStudentBody, EditResultBody } from './lecturers.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { FileCategory, ResultType } from '@prisma/client';
import { MessageQueueService } from 'src/message-queue/message-queue.service';
import {
  EnrollmentRes,
  EnrollmentWithResultRes,
  LecturerCourseSessionRes,
  LecturerProfileRes,
} from './lecturers.responses';

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
    const courseLecturer = await this.prisma.courseLecturer.findUnique({
      where: {
        uniqueCourseSessionLecturer: { courseSessionId, lecturerId },
        isCoordinator: isCoordinator ? true : undefined,
      },
    });

    if (!courseLecturer)
      throw new ForbiddenException(
        'You are not authorized to register students in this course session.',
      );
  }

  async listCourseSessions(
    lecturerId: string,
  ): Promise<LecturerCourseSessionRes[]> {
    const courseSessions = await this.prisma.courseSession.findMany({
      where: { lecturers: { some: { id: lecturerId } } },
      select: {
        id: true,
        course: { select: { code: true } },
        gradingSystem: { select: { id: true, name: true } },
        session: { select: { academicYear: true } },
        deptsAndLevels: {
          select: { level: true, department: { select: { name: true } } },
        },
        _count: { select: { enrollments: true, lecturers: true } },
      },
    });

    return courseSessions.map((courseSession) => ({
      id: courseSession.id,
      courseCode: courseSession.course.code,
      gradingSystem: courseSession.gradingSystem.name,
      session: courseSession.session.academicYear,
      deptsAndLevels: courseSession.deptsAndLevels.map((deptAndLevel) => ({
        level: deptAndLevel.level,
        department: deptAndLevel.department.name,
      })),
      enrollmentCount: courseSession._count.enrollments,
      lecturerCount: courseSession._count.lecturers,
    }));
  }

  async registerStudent(
    lecturerId: string,
    courseSessionId: string,
    { matricNumber }: RegisterStudentBody,
  ) {
    await this.validateCourseLecturerAccess(lecturerId, courseSessionId, true);
    const student = await this.prisma.student.findUniqueOrThrow({
      where: { matricNumber },
    });
    await this.prisma.enrollment.create({
      data: {
        studentId: student.id,
        courseSessionId,
        levelAtEnrollment: student.level,
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

  async listCourseResults(
    lecturerId: string,
    courseSessionId: string,
  ): Promise<EnrollmentWithResultRes[]> {
    await this.validateCourseLecturerAccess(lecturerId, courseSessionId);
    const enrollments = await this.prisma.enrollment.findMany({
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
        results: {
          select: { id: true, type: true, scores: true, evaluations: true },
        },
      },
    });

    return enrollments.map((enrollment) => ({
      ...enrollment,
      student: {
        ...enrollment.student,
        department: enrollment.student.department.name,
      },
      results: enrollment.results.map((result) => ({
        id: result.id,
        scores: result.scores as object,
        type: result.type,
        evaluations: result.evaluations as object,
      })),
    }));
  }

  async listCourseStudents(
    lecturerId: string,
    courseSessionId: string,
  ): Promise<EnrollmentRes[]> {
    await this.validateCourseLecturerAccess(lecturerId, courseSessionId);
    const enrollments = await this.prisma.enrollment.findMany({
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

    return enrollments.map((enrollment) => ({
      id: enrollment.id,
      status: enrollment.status,
      student: {
        ...enrollment.student,
        department: enrollment.student.department.name,
      },
    }));
  }

  async getProfile(lecturerId: string): Promise<LecturerProfileRes> {
    const lecturer = await this.prisma.lecturer.findUniqueOrThrow({
      where: { id: lecturerId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        otherName: true,
        title: true,
        phone: true,
        qualification: true,
        gender: true,
        department: { select: { name: true } },
        user: { select: { email: true } },
      },
    });

    return {
      ...lecturer,
      department: lecturer.department.name,
      email: lecturer.user.email,
    };
  }
}
