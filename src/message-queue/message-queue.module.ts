import { forwardRef, Module } from '@nestjs/common';
import { MessageQueueService } from './message-queue.service';
import { TokensModule } from 'src/tokens/tokens.module';
import { BullModule } from '@nestjs/bullmq';
import { QueueTable } from './message-queue.schema';
import { EmailsProcessor } from './processors/emails.processor';
import { FilesProcessor } from './processors/files.processor';
import { FilesModule } from 'src/files/files.module';

@Module({
  imports: [
    BullModule.registerQueue(
      { name: QueueTable.EMAILS },
      { name: QueueTable.FILES },
    ),
    TokensModule,
    forwardRef(() => FilesModule),
  ],
  providers: [MessageQueueService, EmailsProcessor, FilesProcessor],
  exports: [MessageQueueService],
})
export class MessageQueueModule {}
