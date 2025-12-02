import { Module } from '@nestjs/common';
import { CoursesService } from './courses.service';
import { CoursesController } from './courses.controller';
import { MessageQueueModule } from 'src/message-queue/message-queue.module';

@Module({
  imports: [MessageQueueModule],
  controllers: [CoursesController],
  providers: [CoursesService],
})
export class CoursesModule {}
