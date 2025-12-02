import { Injectable } from "@nestjs/common";
import type { PrismaService } from "src/prisma/prisma.service";
import type { CreateCourseBody, UpdateCourseBody } from "./courses.schema";
import type { UploadFileBody } from "src/files/files.schema";
import { FileCategory } from "@prisma/client";
import type { MessageQueueService } from "src/message-queue/message-queue.service";

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

	async uploadFileForCourses(
		userId: string,
		{ filename, content }: UploadFileBody,
	) {
		const createdFile = await this.prisma.file.create({
			data: {
				filename,
				content: Buffer.from(content, "utf-8"),
				userId,
				category: FileCategory.COURSES,
			},
		});

		const job = await this.messageQueueService.enqueueFile({
			fileId: createdFile.id,
			fileCategory: FileCategory.COURSES,
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
