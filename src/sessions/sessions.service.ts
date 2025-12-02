import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  AssignCoursesToSessionBody,
  AssignDeptAndLevelBody,
  AssignLecturersBody,
  CreateSessionBody,
} from './sessions.schema';

@Injectable()
export class SessionsService {
  constructor(private readonly prisma: PrismaService) {}

  async createSession({ academicYear, startDate, endDate }: CreateSessionBody) {
    const foundSession = await this.prisma.session.findFirst({
      where: {
        AND: { startDate: { lte: startDate }, endDate: { gte: endDate } },
        academicYear,
      },
    });
    if (foundSession) throw new ConflictException('Session already exists');

    return await this.prisma.session.create({
      data: { academicYear, startDate, endDate },
    });
  }

  async getSessions() {
    const foundSessions = await this.prisma.session.findMany({
      orderBy: { endDate: 'desc' },
      select: {
        id: true,
        academicYear: true,
        startDate: true,
        endDate: true,
      },
    });

    return foundSessions;
  }

  async getSession(sessionId: string) {
    const foundSession = await this.prisma.session.findUniqueOrThrow({
      where: { id: sessionId },
      select: {
        id: true,
        academicYear: true,
        startDate: true,
        endDate: true,
      },
    });

    return {
      id: foundSession.id,
      academicYear: foundSession.academicYear,
      startDate: foundSession.startDate,
      endDate: foundSession.endDate,
    };
  }

  async assignCoursesToSession(
    sessionId: string,
    { courseIds }: AssignCoursesToSessionBody,
  ) {
    await this.prisma.courseSession.createMany({
      data: courseIds.map((courseId) => ({
        sessionId,
        courseId,
        // TODO: Implement grading system
        gradingSystemId: 'GRADING SYSTEM ID',
      })),
      skipDuplicates: true,
    });
  }

  async getCoursesInSession(sessionId: string) {
    return await this.prisma.course.findMany({
      where: { courseSessions: { every: { sessionId } } },
      select: {
        id: true,
        code: true,
        title: true,
        description: true,
        semester: true,
        units: true,
        department: { select: { id: true, name: true, shortName: true } },
      },
    });
  }

  async assignLecturersToCourse(
    sessionId: string,
    courseId: string,
    body: AssignLecturersBody,
  ) {
    if (!body.lecturerIds.includes(body.coordinatorId)) {
      throw new BadRequestException('Coordinator not included in lecturers');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.courseLecturer.deleteMany({
        where: { courseSession: { courseId, sessionId } },
      });
      await tx.courseSession.update({
        where: { uniqueCourseSession: { courseId, sessionId } },
        data: {
          lecturers: {
            createMany: {
              data: body.lecturerIds.map((id) => {
                const isCoordinator = id === body.coordinatorId;
                return { lecturerId: id, isCoordinator };
              }),
              skipDuplicates: true,
            },
          },
        },
      });
    });
  }

  async getCourseLecturers(sessionId: string, courseId: string) {
    const foundCourseLecturers = await this.prisma.courseLecturer.findMany({
      where: { courseSession: { courseId, sessionId } },
      select: {
        lecturer: {
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
        },
      },
    });

    return foundCourseLecturers.map((courseLecturer) => ({
      id: courseLecturer.lecturer.id,
      firstName: courseLecturer.lecturer.firstName,
      lastName: courseLecturer.lecturer.lastName,
      otherName: courseLecturer.lecturer.otherName,
      phone: courseLecturer.lecturer.phone,
      title: courseLecturer.lecturer.title,
      qualification: courseLecturer.lecturer.qualification,
      department: courseLecturer.lecturer.department.name,
      email: courseLecturer.lecturer.user.email,
    }));
  }

  async assignDeptsAndLevelsToCourse(
    sessionId: string,
    courseId: string,
    body: AssignDeptAndLevelBody[],
  ) {
    await this.prisma.$transaction(async (tx) => {
      await tx.courseSesnDeptAndLevel.deleteMany({
        where: { courseSession: { courseId, sessionId } },
      });
      await tx.courseSession.update({
        where: { uniqueCourseSession: { courseId, sessionId } },
        data: {
          deptsAndLevels: {
            createMany: {
              data: body.map(({ departmentId, level }) => ({
                departmentId,
                level,
              })),
            },
          },
        },
      });
    });
  }

  async getDeptsAndLevelsForCourse(sessionId: string, courseId: string) {
    return await this.prisma.courseSesnDeptAndLevel.findMany({
      where: { courseSession: { courseId, sessionId } },
      select: {
        department: { select: { id: true, name: true, shortName: true } },
        level: true,
      },
    });
  }
}
