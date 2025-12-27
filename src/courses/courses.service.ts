import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateCourseBody, UpdateCourseBody } from './courses.schema';
import { FileCategory } from '@prisma/client';
import { MessageQueueService } from 'src/message-queue/message-queue.service';

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

    const job = await this.messageQueueService.enqueueFile({
      fileId: createdFile.id,
    });

    return job;
  }

  async getCourses() {
    return await this.prisma.course.findMany({
      where: { deletedAt: null },
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

  async getCourse(courseId: string) {
    return await this.prisma.course.findUniqueOrThrow({
      where: { id: courseId },
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
