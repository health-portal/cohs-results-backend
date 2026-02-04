import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateCourseBody, UpdateCourseBody } from './courses.dto';
import { FileCategory } from '@prisma/client';
import { MessageQueueService } from 'src/message-queue/message-queue.service';
import { CourseRes } from './courses.responses';

@Injectable()
export class CoursesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly messageQueueService: MessageQueueService,
  ) {}

  async createCourse({
    code,
    title,
    description,
    department,
    semester,
    units,
  }: CreateCourseBody) {
    await this.prisma.course.create({
      data: {
        code,
        title,
        description,
        department: { connect: { name: department } },
        semester,
        units,
      },
    });
  }

  async uploadFileForCourses(userId: string, file: Express.Multer.File) {
    const createdFile = await this.prisma.file.create({
      data: {
        filename: file.originalname,
        buffer: Buffer.from(file.buffer),
        userId,
        category: FileCategory.COURSES,
        mimetype: file.mimetype,
      },
    });

    await this.messageQueueService.enqueueFile({
      fileId: createdFile.id,
    });
  }

  async getCourses(): Promise<CourseRes[]> {
    const courses = await this.prisma.course.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        code: true,
        title: true,
        description: true,
        semester: true,
        units: true,
        department: {
          select: {
            name: true,
          },
        },
      },
    });

    return courses.map((course) => ({
      id: course.id,
      code: course.code,
      title: course.title,
      description: course.description,
      semester: course.semester,
      units: course.units,
      department: course.department.name,
    }));
  }

  async getCourse(courseId: string): Promise<CourseRes> {
    const course = await this.prisma.course.findUniqueOrThrow({
      where: { id: courseId },
      select: {
        id: true,
        code: true,
        title: true,
        description: true,
        semester: true,
        units: true,
        department: {
          select: {
            name: true,
          },
        },
      },
    });

    return {
      id: course.id,
      code: course.code,
      title: course.title,
      description: course.description,
      semester: course.semester,
      units: course.units,
      department: course.department.name,
    };
  }

  async updateCourse(
    courseId: string,
    { title, description }: UpdateCourseBody,
  ) {
    await this.prisma.course.update({
      where: { id: courseId },
      data: { title, description },
    });
  }

  async deleteCourse(courseId: string) {
    await this.prisma.course.update({
      where: { id: courseId },
      data: { deletedAt: new Date() },
    });
  }
}
