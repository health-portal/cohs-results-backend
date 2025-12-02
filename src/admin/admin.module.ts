import { Module } from "@nestjs/common";
import { AdminService } from "./admin.service";
import { AdminController } from "./admin.controller";
import { MessageQueueModule } from "src/message-queue/message-queue.module";

@Module({
	imports: [MessageQueueModule],
	controllers: [AdminController],
	providers: [AdminService],
})
export class AdminModule {}
