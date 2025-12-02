import { forwardRef, Module } from "@nestjs/common";
import { MessageQueueService } from "./message-queue.service";
import { TokensModule } from "src/tokens/tokens.module";
import { FilesModule } from "src/files/files.module";

@Module({
	imports: [TokensModule, forwardRef(() => FilesModule)],
	providers: [MessageQueueService],
	exports: [MessageQueueService],
})
export class MessageQueueModule {}
