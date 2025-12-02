import { forwardRef, Module } from '@nestjs/common';
import { FilesModule } from 'src/files/files.module';
import { TokensModule } from 'src/tokens/tokens.module';
import { MessageQueueService } from './message-queue.service';

@Module({
  imports: [TokensModule, forwardRef(() => FilesModule)],
  providers: [MessageQueueService],
  exports: [MessageQueueService],
})
export class MessageQueueModule {}
