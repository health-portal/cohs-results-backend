import { Module } from "@nestjs/common";
import { LecturersService } from "./lecturers.service";
import { LecturersController } from "./lecturers.controller";
import { MessageQueueModule } from "src/message-queue/message-queue.module";

@Module({
	imports: [MessageQueueModule],
	controllers: [LecturersController],
	providers: [LecturersService],
})
export class LecturersModule {}
