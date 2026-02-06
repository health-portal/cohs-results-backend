import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import * as argon2 from 'argon2';
import { ChangePasswordBody } from 'src/auth/auth.dto';
import { StudentEnrollmentRes, StudentProfileRes } from './students.responses';

@Injectable()
export class StudentService {
  constructor(private readonly prisma: PrismaService) {}

  async changePassword(
    userId: string,
    { currentPassword, newPassword }: ChangePasswordBody,
  ) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });

    const isPasswordValid = await argon2.verify(
      user.password!,
      currentPassword,
    );
    if (!isPasswordValid) throw new BadRequestException('Invalid password');

    const hashedPassword = await argon2.hash(newPassword);
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });
  }

  async listEnrollments(studentId: string): Promise<StudentEnrollmentRes[]> {
    const enrollments = await this.prisma.enrollment.findMany({
      where: { studentId },
      select: {
        id: true,
        status: true,
        levelAtEnrollment: true,
        results: { select: { type: true, scores: true, evaluations: true } },
      },
    });

    return enrollments.map((enrollment) => ({
      ...enrollment,
      results: enrollment.results.map((result) => ({
        scores: result.scores as object,
        type: result.type,
        evaluations: result.evaluations as object,
      })),
    }));
  }

  async listEnrollment(
    studentId: string,
    enrollmentId: string,
  ): Promise<StudentEnrollmentRes> {
    const enrollment = await this.prisma.enrollment.findUniqueOrThrow({
      where: { id: enrollmentId, studentId },
      select: {
        id: true,
        status: true,
        levelAtEnrollment: true,
        results: { select: { type: true, scores: true, evaluations: true } },
      },
    });

    return {
      ...enrollment,
      results: enrollment.results.map((result) => ({
        scores: result.scores as object,
        type: result.type,
        evaluations: result.evaluations as object,
      })),
    };
  }

  async getProfile(studentId: string): Promise<StudentProfileRes> {
    const student = await this.prisma.student.findUniqueOrThrow({
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
      ...student,
      department: student.department.name,
      email: student.user.email,
    };
  }
}
