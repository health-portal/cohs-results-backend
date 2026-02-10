import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  AssignCourseToSessionBody,
  AssignDeptAndLevelBody,
  AssignLecturersBody,
  CreateSessionBody,
  UpdateCourseInSessionBody,
  UpdateSessionBody,
} from './sessions.dto';
import {
  CourseLecturerRes,
  CourseSessionRes,
  DeptAndLevelRes,
} from './sessions.responses';

@Injectable()
export class SessionsService {
  constructor(private readonly prisma: PrismaService) {}

  async createSession({ academicYear, startDate, endDate }: CreateSessionBody) {
    const session = await this.prisma.session.findFirst({
      where: {
        AND: { startDate: { lte: startDate }, endDate: { gte: endDate } },
        academicYear,
      },
    });
    if (session) throw new ConflictException('Session already exists');

    return await this.prisma.session.create({
      data: { academicYear, startDate, endDate },
    });
  }

  async updateSession(
    sessionId: string,
    { academicYear, startDate, endDate }: UpdateSessionBody,
  ) {
    return await this.prisma.session.update({
      where: { id: sessionId },
      data: { academicYear, startDate, endDate },
    });
  }

  async deleteSession(sessionId: string) {
    return await this.prisma.session.update({
      where: { id: sessionId },
      data: { deletedAt: new Date() },
    });
  }

  async getSessions() {
    const sessions = await this.prisma.session.findMany({
      orderBy: { endDate: 'desc' },
      select: {
        id: true,
        academicYear: true,
        startDate: true,
        endDate: true,
      },
    });

    return sessions;
  }

  async getSession(sessionId: string) {
    const session = await this.prisma.session.findUniqueOrThrow({
      where: { id: sessionId },
      select: {
        id: true,
        academicYear: true,
        startDate: true,
        endDate: true,
      },
    });

    return {
      id: session.id,
      academicYear: session.academicYear,
      startDate: session.startDate,
      endDate: session.endDate,
    };
  }

  async assignCoursesToSession(
    sessionId: string,
    body: AssignCourseToSessionBody[],
  ) {
    await this.prisma.courseSession.createMany({
      data: body.map(({ courseId, gradingSystemId }) => ({
        sessionId,
        courseId,
        gradingSystemId,
      })),
      skipDuplicates: true,
    });
  }

  async updateCourseInSession(
    sessionId: string,
    courseId: string,
    body: UpdateCourseInSessionBody,
  ) {
    await this.prisma.courseSession.update({
      where: { uniqueCourseSession: { sessionId, courseId } },
      data: {
        gradingSystemId: body.gradingSystemId,
      },
    });
  }

  async getCoursesInSession(sessionId: string): Promise<CourseSessionRes[]> {
    const courseSessions = await this.prisma.courseSession.findMany({
      where: { sessionId },
      select: {
        id: true,
        session: { select: { id: true, academicYear: true } },
        gradingSystem: { select: { name: true } },
        deptsAndLevels: {
          select: {
            id: true,
            level: true,
            department: {
              select: {
                name: true,
              },
            },
          },
        },
        course: {
          select: {
            id: true,
            code: true,
            department: { select: { name: true } },
            units: true,
            semester: true,
          },
        },
        _count: {
          select: {
            lecturers: true,
          },
        },
      },
    });

    return courseSessions.map((courseSession) => ({
      id: courseSession.id,
      session: {
        id: courseSession.session.id,
        academicYear: courseSession.session.academicYear,
      },
      gradingSystem: courseSession.gradingSystem.name,
      deptsAndLevels: courseSession.deptsAndLevels.map((deptAndLevel) => ({
        id: deptAndLevel.id,
        level: deptAndLevel.level,
        department: deptAndLevel.department.name,
      })),
      course: {
        ...courseSession.course,
        department: courseSession.course.department.name,
      },
      lecturerCount: courseSession._count.lecturers,
    }));
  }

  async assignLecturersToCourse(
    sessionId: string,
    courseId: string,
    body: AssignLecturersBody,
  ) {
    if (!body.lecturerIds.includes(body.coordinatorId))
      throw new BadRequestException('Coordinator not included in lecturers');

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

  async getCourseLecturers(
    sessionId: string,
    courseId: string,
  ): Promise<CourseLecturerRes[]> {
    const courseLecturers = await this.prisma.courseLecturer.findMany({
      where: { courseSession: { courseId, sessionId } },
      select: {
        id: true,
        isCoordinator: true,
        lecturer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            otherName: true,
            title: true,
            department: { select: { name: true } },
            user: { select: { email: true } },
          },
        },
      },
    });

    return courseLecturers.map((courseLecturer) => ({
      ...courseLecturer,
      lecturer: {
        ...courseLecturer.lecturer,
        department: courseLecturer.lecturer.department.name,
        email: courseLecturer.lecturer.user.email,
      },
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

  async getDeptsAndLevelsForCourse(
    sessionId: string,
    courseId: string,
  ): Promise<DeptAndLevelRes[]> {
    const courseSesnDeptAndLevels =
      await this.prisma.courseSesnDeptAndLevel.findMany({
        where: { courseSession: { courseId, sessionId } },
        select: {
          id: true,
          createdAt: true,
          updatedAt: true,
          courseSessionId: true,
          department: {
            select: {
              name: true,
            },
          },
          level: true,
        },
      });

    return courseSesnDeptAndLevels.map((courseSesnDeptAndLevel) => ({
      ...courseSesnDeptAndLevel,
      department: courseSesnDeptAndLevel.department.name,
    }));
  }
}
