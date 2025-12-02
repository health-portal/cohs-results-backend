import { Module } from "@nestjs/common";
import { StudentsService } from "./students.service";
import { StudentsController } from "./students.controller";
import { StudentController } from "./student.controller";
import { StudentService } from "./student.service";
import { MessageQueueModule } from "src/message-queue/message-queue.module";

@Module({
	imports: [MessageQueueModule],
	controllers: [StudentController, StudentsController],
	providers: [StudentService, StudentsService],
})
export class StudentsModule {}
