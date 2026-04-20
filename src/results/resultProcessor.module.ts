import { Module } from "@nestjs/common";
import { PrismaModule } from "src/prisma/prisma.module";
import { ResultProcessorService } from "./resultProcessor.service";
import { LecturerService } from "src/lecturers/lecturer.service";
import { LecturerController } from "src/lecturers/lecturer.controller";
import { MessageQueueModule } from "src/message-queue/message-queue.module";
import { CloudinaryModule } from "src/cloudinary/cloudinary.module";
import { PrismaService } from "src/prisma/prisma.service";
import { ApprovalModule } from "src/approvals/approvals.module";

@Module({
  imports:     [PrismaModule, MessageQueueModule, ApprovalModule, CloudinaryModule,],
  providers:   [ResultProcessorService, LecturerService, PrismaService],
  exports:     [ResultProcessorService],
})
export class ResultsProcessorModule {}