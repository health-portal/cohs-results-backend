import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  CreateLecturerBody,
  GetLecturersQuery,
  UpdateLecturerBody,
} from './lecturers.dto';
import { FileCategory, Prisma, UserRole } from '@prisma/client';
import { MessageQueueService } from 'src/message-queue/message-queue.service';
import { LecturerProfileRes } from './lecturers.responses';

@Injectable()
export class LecturersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly messageQueueService: MessageQueueService,
  ) {}

  async createLecturer({
    email,
    firstName,
    lastName,
    otherName,
    department,
    phone,
    title,
    gender,
  }: CreateLecturerBody) {
    const createdUser = await this.prisma.user.create({
      data: {
        email,
        role: UserRole.LECTURER,
        lecturer: {
          create: {
            firstName,
            lastName,
            otherName,
            department: { connect: { name: department } },
            phone,
            title,
            gender,
          },
        },
      },
    });

    await this.messageQueueService.enqueueSetPasswordEmail({
      isActivateAccount: true,
      tokenPayload: {
        email: createdUser.email,
        role: UserRole.LECTURER,
        sub: createdUser.id,
      },
    });
  }

  async uploadFileForLecturers(userId: string, file: Express.Multer.File) {
    const createdFile = await this.prisma.file.create({
      data: {
        filename: file.originalname,
        buffer: Buffer.from(file.buffer),
        userId,
        category: FileCategory.LECTURERS,
        mimetype: file.mimetype,
      },
    });

    await this.messageQueueService.enqueueFile({
      fileId: createdFile.id,
    });
  }

  async getLecturers(query: GetLecturersQuery): Promise<LecturerProfileRes[]> {
    const where: Prisma.LecturerWhereInput = {
      deletedAt: null,
    };

    if (query.title) {
      where.title = {
        contains: query.title,
        mode: 'insensitive',
      };
    }

    if (query.department) {
      where.department = {
        name: {
          contains: query.department,
          mode: 'insensitive',
        },
      };
    }
    const lecturers = await this.prisma.lecturer.findMany({
      where,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        otherName: true,
        title: true,
        phone: true,
        gender: true,
        qualification: true,
        department: { select: { name: true } },
        user: { select: { email: true } },
      },
    });

    return lecturers.map((lecturer) => ({
      ...lecturer,
      email: lecturer.user.email,
      department: lecturer.department.name,
    }));
  }

  async updateLecturer(
    lecturerId: string,
    {
      firstName,
      lastName,
      otherName,
      department,
      phone,
      title,
    }: UpdateLecturerBody,
  ) {
    await this.prisma.user.update({
      where: { id: lecturerId },
      data: {
        lecturer: {
          update: {
            firstName,
            lastName,
            otherName,
            department: { connect: { name: department } },
            phone,
            title,
          },
        },
      },
      include: { lecturer: true },
    });
  }

  async deleteLecturer(lecturerId: string) {
    await this.prisma.user.update({
      where: { id: lecturerId },
      data: { deletedAt: new Date() },
    });
  }
}
