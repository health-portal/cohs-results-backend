import { Module } from '@nestjs/common';
import { LecturersService } from './lecturers.service';
import { LecturerService } from './lecturer.service';
import { LecturersController } from './lecturers.controller';
import { LecturerController } from './lecturer.controller';
import { MessageQueueModule } from 'src/message-queue/message-queue.module';

@Module({
  imports: [MessageQueueModule],
  controllers: [LecturersController, LecturerController],
  providers: [LecturersService, LecturerService],
})
export class LecturersModule {}
