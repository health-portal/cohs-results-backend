import { BadRequestException, Injectable } from "@nestjs/common";
import type { ChangePasswordBody } from "src/auth/auth.schema";
import type { PrismaService } from "src/prisma/prisma.service";
import * as argon2 from "argon2";

@Injectable()
export class StudentService {
	constructor(private readonly prisma: PrismaService) {}

	async changePassword(
		userId: string,
		{ currentPassword, newPassword }: ChangePasswordBody,
	) {
		const foundUser = await this.prisma.user.findUniqueOrThrow({
			where: { id: userId },
		});

		const isPasswordValid = await argon2.verify(
			foundUser.password!,
			currentPassword,
		);
		if (!isPasswordValid) throw new BadRequestException("Invalid password");

		const hashedPassword = await argon2.hash(newPassword);
		await this.prisma.user.update({
			where: { id: userId },
			data: { password: hashedPassword },
		});
	}

	async listEnrollments(studentId: string) {
		const foundEnrollments = await this.prisma.enrollment.findMany({
			where: { studentId },
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
				scores: result.scores,
				type: result.type,
			})),
		}));
	}

	async listEnrollment(studentId: string, enrollmentId: string) {
		const foundEnrollment = await this.prisma.enrollment.findUniqueOrThrow({
			where: { id: enrollmentId, studentId },
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

		return {
			id: foundEnrollment.id,
			status: foundEnrollment.status,
			studentId: foundEnrollment.student.id,
			studentName:
				`${foundEnrollment.student.lastName} ${foundEnrollment.student.firstName} ${foundEnrollment.student.otherName}`.trim(),
			studentLevel: foundEnrollment.student.level,
			studentDepartment: foundEnrollment.student.department.name,
			results: foundEnrollment.results.map((result) => ({
				scores: result.scores,
				type: result.type,
			})),
		};
	}

	async getProfile(studentId: string) {
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
}
