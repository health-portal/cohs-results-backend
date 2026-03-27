import { Module } from '@nestjs/common';
import { LecturersService } from './lecturers.service';
import { LecturerService } from './lecturer.service';
import { LecturersController } from './lecturers.controller';
import { LecturerController } from './lecturer.controller';
import { MessageQueueModule } from 'src/message-queue/message-queue.module';
import { ApprovalsService } from 'src/approvals/approvals.service';
import { ApprovalModule } from 'src/approvals/approvals.module';

@Module({
  imports: [MessageQueueModule, ApprovalModule],
  controllers: [LecturersController, LecturerController],
  providers: [LecturersService, LecturerService, ApprovalsService],
})
export class LecturersModule {}
