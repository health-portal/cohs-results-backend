import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { JwtModule } from "@nestjs/jwt";
import { ScheduleModule } from "@nestjs/schedule";
import { env } from "./lib/environment";
import { AdminModule } from "./admin/admin.module";
import { AuthModule } from "./auth/auth.module";
import { CollegeModule } from "./college/college.module";
import { CoursesModule } from "./courses/courses.module";
import { LecturersModule } from "./lecturers/lecturers.module";
import { PrismaModule } from "./prisma/prisma.module";
import { SessionsModule } from "./sessions/sessions.module";
import { StudentsModule } from "./students/students.module";
import { MessageQueueModule } from "./message-queue/message-queue.module";
import { GradingSystemsModule } from "./grading-systems/grading-systems.module";
import { FilesModule } from "./files/files.module";

@Module({
	imports: [
		BullModule.forRoot({
			connection: {
				// host: env.REDIS_HOST,
				// password: env.REDIS_PASSWORD,
				// port: env.REDIS_PORT,
				// username: env.REDIS_USERNAME,
				// tls: { rejectUnauthorized: false },
				url: env.REDIS_URL,
				connectTimeout: 10000,
				enableReadyCheck: false,
				maxRetriesPerRequest: null,
				lazyConnect: true,
			},
		}),
		JwtModule.register({ global: true, secret: env.JWT_SECRET }),
		ScheduleModule.forRoot(),
		AdminModule,
		AuthModule,
		CollegeModule,
		CoursesModule,
		LecturersModule,
		PrismaModule,
		SessionsModule,
		StudentsModule,
		MessageQueueModule,
		GradingSystemsModule,
		FilesModule,
	],
})
export class AppModule {}
