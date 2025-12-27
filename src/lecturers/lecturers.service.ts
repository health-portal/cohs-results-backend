import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateLecturerBody, UpdateLecturerBody } from './lecturers.schema';
import { FileCategory, UserRole } from '@prisma/client';
import { MessageQueueService } from 'src/message-queue/message-queue.service';

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
          },
        },
      },
    });

    await this.messageQueueService.enqueueSetPasswordEmail({
      isActivateAccount: true,
      tokenPayload: {
        email: createdUser.email,
        role: UserRole.ADMIN,
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

  async getLecturers() {
    const foundLecturers = await this.prisma.lecturer.findMany({
      where: { deletedAt: null },
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

    return foundLecturers.map((lecturer) => ({
      id: lecturer.id,
      firstName: lecturer.firstName,
      lastName: lecturer.lastName,
      otherName: lecturer.otherName,
      phone: lecturer.phone,
      title: lecturer.title,
      qualification: lecturer.qualification,
      department: lecturer.department.name,
      email: lecturer.user.email,
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
