import { forwardRef, Module } from '@nestjs/common';
import { FilesService } from './files.service';
import { MessageQueueModule } from 'src/message-queue/message-queue.module';

@Module({
  imports: [forwardRef(() => MessageQueueModule)],
  providers: [FilesService],
  exports: [FilesService],
})
export class FilesModule {}
