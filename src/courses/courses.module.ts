import { Module } from '@nestjs/common';
import { CoursesService } from './courses.service';
import { CoursesController } from './courses.controller';
import { MessageQueueModule } from 'src/message-queue/message-queue.module';
import { FilesModule } from 'src/files/files.module';

@Module({
  imports: [FilesModule, MessageQueueModule],
  controllers: [CoursesController],
  providers: [CoursesService],
})
export class CoursesModule {}
