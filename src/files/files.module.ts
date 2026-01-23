import { forwardRef, Module } from '@nestjs/common';
import { FilesService } from './files.service';
import { MessageQueueModule } from 'src/message-queue/message-queue.module';
import { FilesController } from './files.controller';
import { GradingSystemsModule } from 'src/grading-systems/grading-systems.module';

@Module({
  imports: [forwardRef(() => MessageQueueModule), GradingSystemsModule],
  providers: [FilesService],
  exports: [FilesService],
  controllers: [FilesController],
})
export class FilesModule {}
