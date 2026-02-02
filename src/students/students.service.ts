import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  CreateStudentBody,
  StudentProfileRes,
  UpdateStudentBody,
} from './students.schema';
import { FileCategory, UserRole } from '@prisma/client';
import { MessageQueueService } from 'src/message-queue/message-queue.service';

@Injectable()
export class StudentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly messageQueueService: MessageQueueService,
  ) {}

  async createStudent({
    email,
    firstName,
    lastName,
    otherName,
    matricNumber,
    department,
    admissionYear,
    degree,
    gender,
    level,
  }: CreateStudentBody) {
    const createdUser = await this.prisma.user.create({
      data: {
        email,
        role: UserRole.STUDENT,
        student: {
          create: {
            firstName,
            lastName,
            otherName,
            matricNumber,
            department: { connect: { name: department } },
            admissionYear,
            degree,
            gender,
            level,
          },
        },
      },
    });

    await this.messageQueueService.enqueueSetPasswordEmail({
      isActivateAccount: true,
      tokenPayload: {
        email: createdUser.email,
        role: UserRole.STUDENT,
        sub: createdUser.id,
      },
    });
  }

  async uploadFileForStudents(userId: string, file: Express.Multer.File) {
    const createdFile = await this.prisma.file.create({
      data: {
        filename: file.originalname,
        buffer: Buffer.from(file.buffer),
        userId,
        category: FileCategory.STUDENTS,
        mimetype: file.mimetype,
      },
    });

    await this.messageQueueService.enqueueFile({
      fileId: createdFile.id,
    });
  }

  async getStudents(): Promise<StudentProfileRes[]> {
    const foundStudents = await this.prisma.student.findMany({
      select: {
        id: true,
        firstName: true,
        lastName: true,
        otherName: true,
        matricNumber: true,
        admissionYear: true,
        degree: true,
        gender: true,
        level: true,
        status: true,
        department: { select: { name: true } },
        user: { select: { email: true } },
      },
      where: { deletedAt: null },
    });

    return foundStudents.map((student) => ({
      id: student.id,
      firstName: student.firstName,
      lastName: student.lastName,
      otherName: student.otherName,
      matricNumber: student.matricNumber,
      admissionYear: student.admissionYear,
      degree: student.degree,
      gender: student.gender,
      level: student.level,
      status: student.status,
      department: student.department.name,
      email: student.user.email,
    }));
  }

  async getStudent(studentId: string): Promise<StudentProfileRes> {
    const foundStudent = await this.prisma.student.findUniqueOrThrow({
      where: { id: studentId, deletedAt: null },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        otherName: true,
        matricNumber: true,
        admissionYear: true,
        degree: true,
        gender: true,
        level: true,
        status: true,
        department: { select: { name: true } },
        user: { select: { email: true } },
      },
    });

    return {
      id: foundStudent.id,
      firstName: foundStudent.firstName,
      lastName: foundStudent.lastName,
      otherName: foundStudent.otherName,
      matricNumber: foundStudent.matricNumber,
      admissionYear: foundStudent.admissionYear,
      degree: foundStudent.degree,
      gender: foundStudent.gender,
      level: foundStudent.level,
      status: foundStudent.status,
      department: foundStudent.department.name,
      email: foundStudent.user.email,
    };
  }

  async updateStudent(
    studentId: string,
    {
      firstName,
      lastName,
      otherName,
      department,
      admissionYear,
      degree,
      gender,
      level,
    }: UpdateStudentBody,
  ) {
    await this.prisma.student.update({
      where: { id: studentId },
      data: {
        firstName,
        lastName,
        otherName,
        department: { connect: { name: department } },
        admissionYear,
        degree,
        gender,
        level,
      },
    });
  }

  async deleteStudent(studentId: string) {
    await this.prisma.student.update({
      where: { id: studentId },
      data: {
        deletedAt: new Date(),
      },
    });
  }
}
