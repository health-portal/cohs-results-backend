import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { ApprovalManager } from './approval.manager';
import { FileCategory } from '@prisma/client';

@Injectable()
export class ApprovalsService {
    constructor(private readonly prisma: PrismaService,
    private readonly approvalManager: ApprovalManager,)
    {}
    
  // result-upload.service.ts — paste into your existing results/upload service

async uploadDepartmentResult(
  lecturerId: string,
  courseSesnDeptLevelId: string,
  file: Express.Multer.File,
): Promise<void> {
  // 1. Verify the lecturer is assigned to this course session
  const deptLevel = await this.prisma.courseSesnDeptAndLevel.findUnique({
    where: { id: courseSesnDeptLevelId },
    include: {
      courseSession: {
        include: {
          lecturers: true, // CourseLecturer[]
        },
      },
    },
  });

  if (!deptLevel) {
    throw new NotFoundException(
      `CourseSesnDeptAndLevel ${courseSesnDeptLevelId} not found`,
    );
  }

  const isAssigned = deptLevel.courseSession.lecturers.some(
    (cl) => cl.lecturerId === lecturerId,
  );

  if (!isAssigned) {
    throw new ForbiddenException(
      `You are not assigned to this course session`,
    );
  }

  // 2. Get the lecturer's userId for the File record
  const lecturer = await this.prisma.lecturer.findUniqueOrThrow({
    where: { id: lecturerId },
    select: { userId: true },
  });

  await this.prisma.$transaction(async (tx) => {
    // 3. Save the file
    const savedFile = await tx.file.create({
      data: {
        filename:    file.originalname,
        buffer:      Buffer.from(file.buffer) as unknown as Uint8Array<ArrayBuffer>,
        mimetype:    file.mimetype,
        category:    FileCategory.RESULTS,
        userId:      lecturer.userId,
      },
    });

    // 4. Create or replace the ResultUpload for this dept+level
    // If one already exists (re-upload), replace the file reference
    const existing = await tx.resultUpload.findUnique({
      where: {
        uniqueResultUpload: {
          courseSessionId:       deptLevel.courseSessionId,
          courseSesnDeptLevelId: courseSesnDeptLevelId,
        },
      },
    });

    if (existing) {
      await tx.resultUpload.update({
        where: { id: existing.id },
        data: {
          fileId:      savedFile.id,
          uploadedById: lecturerId,
        },
      });
    } else {
      await tx.resultUpload.create({
        data: {
          courseSessionId:       deptLevel.courseSessionId,
          courseSesnDeptLevelId: courseSesnDeptLevelId,
          uploadedById:          lecturerId,
          fileId:                savedFile.id,
        },
      });
    }
  });

  await this.approvalManager.buildApprovalPipeline(
    deptLevel.courseSessionId,
  );
}

}