import { BadRequestException, ForbiddenException, forwardRef, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { RegisterStudentBody, EditResultBody } from './lecturers.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { ApprovalStatus, DeptResultStatus, FileCategory, ResultType } from '@prisma/client';
import { MessageQueueService } from 'src/message-queue/message-queue.service';
import {
  EnrollmentRes,
  EnrollmentWithResultRes,
  LecturerCourseSessionRes,
  LecturerProfileRes,
} from './lecturers.responses';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import { ApprovalManager } from 'src/approvals/approval.manager';

@Injectable()
export class LecturerService {
  constructor(
    @Inject(forwardRef(() => ApprovalManager))
    private readonly prisma: PrismaService,
    private readonly messageQueueService: MessageQueueService,
  private readonly approvalManager: ApprovalManager,
  private readonly cloudinary: CloudinaryService,
  ) {}

  private async validateCourseLecturerAccess(
    lecturerId: string,
    courseSessionId: string,
    isCoordinator: boolean = false,
  ) {
    const courseLecturer = await this.prisma.courseLecturer.findUnique({
      where: {
        uniqueCourseSessionLecturer: { courseSessionId, lecturerId },
        isCoordinator: isCoordinator ? true : undefined,
      },
    });

    if (!courseLecturer)
      throw new ForbiddenException(
        'You are not authorized to carry out this operation',
      );
  }

  // async listCourseSessions(
  //   lecturerId: string,
  // ): Promise<LecturerCourseSessionRes[]> {
  //   const courseSessions = await this.prisma.courseSession.findMany({
  //     where: { lecturers: { some: { id: lecturerId } } },
  //     select: {
  //       id: true,
  //       course: { select: { code: true } },
  //       gradingSystem: { select: { id: true, name: true } },
  //       session: { select: { academicYear: true } },
  //       deptsAndLevels: {
  //         select: { level: true, department: { select: { name: true } } },
  //       },
  //       _count: { select: { enrollments: true, lecturers: true } },
  //     },
  //   });

  //   return courseSessions.map((courseSession) => ({
  //     id: courseSession.id,
  //     courseCode: courseSession.course.code,
  //     gradingSystem: courseSession.gradingSystem.name,
  //     session: courseSession.session.academicYear,
  //     deptsAndLevels: courseSession.deptsAndLevels.map((deptAndLevel) => ({
  //       level: deptAndLevel.level,
  //       department: deptAndLevel.department.name,
  //     })),
  //     enrollmentCount: courseSession._count.enrollments,
  //     lecturerCount: courseSession._count.lecturers,
  //   }));
  // }


async getLecturerCourseSessions(lecturerId: string) {
  const courseSessions = await this.prisma.courseSession.findMany({
    where: {
      lecturers: { some: { lecturerId } },
    },
    include: {
      course: {
        select: { code: true, title: true },
      },
      session: {
        select: { id: true, academicYear:true },  // whatever your Session model exposes
      },
      deptsAndLevels: {
        include: {
          department: { select: { id: true, name: true } },
          // check if a result has already been uploaded for this dept+level
          resultUploads: {
            select: {
              id:          true,
              uploadedById: true,
              createdAt:   true,
              url: true,
            },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      },
    },
  });

  return courseSessions.map((session) => ({
    courseSessionId: session.id,
    courseCode:      session.course.code,
    courseTitle:     session.course.title,
    session:         session.session.academicYear,
    isApproved:      session.isApproved,
    deptLevels:      session.deptsAndLevels.map((dl) => ({
      courseSesnDeptLevelId: dl.id,
      department:            dl.department.name,
      departmentId:          dl.department.id,
      level:                 dl.level,
      status:               dl.resultStatus,
      uploadStatus: dl.resultUploads[0]
        ? {
            uploaded:    true,
            uploadedAt:  dl.resultUploads[0].createdAt,
            uploadedByMe: dl.resultUploads[0].uploadedById === lecturerId,
            file:        dl.resultUploads[0].url,
          }
        : {
            uploaded: false,
          },
    })),
  }));
}

  async registerStudent(
    lecturerId: string,
    courseSessionId: string,
    { matricNumber }: RegisterStudentBody,
  ) {
    await this.validateCourseLecturerAccess(lecturerId, courseSessionId, true);
    const student = await this.prisma.student.findUniqueOrThrow({
      where: { matricNumber },
    });
    await this.prisma.enrollment.create({
      data: {
        studentId: student.id,
        courseSessionId,
        levelAtEnrollment: student.level,
      },
    });
  }

  async uploadFileForStudentRegistrations(
    userId: string,
    lecturerId: string,
    courseSessionId: string,
    file: Express.Multer.File,
  ) {
    await this.validateCourseLecturerAccess(lecturerId, userId, true);
    const createdFile = await this.prisma.file.create({
      data: {
        filename: file.originalname,
        buffer: Buffer.from(file.buffer),
        userId,
        category: FileCategory.REGISTRATIONS,
        mimetype: file.mimetype,
        metadata: { courseSessionId },
      },
    });

    await this.messageQueueService.enqueueFile({
      fileId: createdFile.id,
    });
  }

  async uploadFileForStudentResults(
    lecturerId: string,
    courseSesnDeptLevelId: string,
    file: Express.Multer.File,
    // resultType: ResultType,
  ) {
    // await this.validateCourseLecturerAccess(lecturerId, userId, true);
    const deptLevel = await this.prisma.courseSesnDeptAndLevel.findUnique({
      where: { id: courseSesnDeptLevelId },
      include: {
        courseSession: {
          include: { lecturers: true },
        },
      },
    });

    if (!deptLevel) {
      throw new NotFoundException(
        `Course Session, Department, And Level ${courseSesnDeptLevelId} not found`,
      );
    }

    const existing = await this.prisma.resultUpload.findUnique({
    where: {
      uniqueResultUpload: {
        courseSessionId:       deptLevel.courseSessionId,
        courseSesnDeptLevelId: courseSesnDeptLevelId,
      },
    },
  });


  // Upload new file to Cloudinary before the transaction
  const { url, publicId } = await this.cloudinary.uploadFile(
    file.buffer,
    file.originalname,
    'results',
  );

  try {
    await this.prisma.$transaction(async (tx) => {

      if (existing) {
        // Update existing upload with new file
        await tx.resultUpload.update({
          where: { id: existing.id },
          data: {
            publicId:       publicId,
            url: url,
          },
        });
      } else {
        await tx.resultUpload.create({
          data: {
            courseSessionId:       deptLevel.courseSessionId,
            courseSesnDeptLevelId: courseSesnDeptLevelId,
            uploadedById:          lecturerId,
            filename:  file.originalname,
            url,
            publicId,
            mimetype:  file.mimetype,
            // resultType,
            category:  FileCategory.RESULTS,
          },
        });
      }
    }, {
    timeout: 20000, // 20 seconds
  });
     // Delete old Cloudinary file after successful transaction
    if (existing?.publicId) {
      await this.cloudinary.deleteFile(existing.publicId);
    }
  } catch (error) {
    // Transaction failed — clean up the newly uploaded Cloudinary file
    await this.cloudinary.deleteFile(publicId);
    throw error;
  }

  // Trigger approval pipeline
  const pipeline = await this.approvalManager.buildApprovalPipeline(deptLevel.courseSessionId, lecturerId);
    // await this.messageQueueService.enqueueFile({
    //   fileId: createdFile.id,
    // });
    return {
    message: 'File uploaded and approval pipeline initiated successfully',
    data: {
      fileName: file.originalname,
      flowsCreated: pipeline.flows.length,
      courseType: pipeline.courseType
    }
  };
}

  async editResult(
    lecturerId: string,
    courseSessionId: string,
    studentId: string,
    { scores }: EditResultBody,
  ) {
    await this.validateCourseLecturerAccess(lecturerId, courseSessionId, true);
    await this.prisma.enrollment.update({
      where: { uniqueEnrollment: { courseSessionId, studentId } },
      data: { results: { create: { scores, type: ResultType.INITIAL } } },
    });
  }

  async listCourseResults(
    lecturerId: string,
    courseSessionId: string,
  ): Promise<EnrollmentWithResultRes[]> {
    await this.validateCourseLecturerAccess(lecturerId, courseSessionId);
    const enrollments = await this.prisma.enrollment.findMany({
      where: { courseSessionId },
      select: {
        id: true,
        status: true,
        student: {
          select: {
            id: true,
            matricNumber: true,
            firstName: true,
            lastName: true,
            otherName: true,
            level: true,
            department: { select: { name: true } },
          },
        },
        results: {
          select: { id: true, type: true, scores: true, evaluations: true },
        },
      },
    });

    return enrollments.map((enrollment) => ({
      ...enrollment,
      student: {
        ...enrollment.student,
        department: enrollment.student.department.name,
      },
      results: enrollment.results.map((result) => ({
        id: result.id,
        scores: result.scores as object,
        type: result.type,
        evaluations: result.evaluations as object,
      })),
    }));
  }

  async listCourseStudents(
    lecturerId: string,
    courseSessionId: string,
  ): Promise<EnrollmentRes[]> {
    await this.validateCourseLecturerAccess(lecturerId, courseSessionId);
    const enrollments = await this.prisma.enrollment.findMany({
      where: { courseSessionId },
      select: {
        id: true,
        status: true,
        student: {
          select: {
            id: true,
            matricNumber: true,
            firstName: true,
            lastName: true,
            otherName: true,
            level: true,
            department: { select: { name: true } },
          },
        },
      },
    });

    return enrollments.map((enrollment) => ({
      id: enrollment.id,
      status: enrollment.status,
      student: {
        ...enrollment.student,
        department: enrollment.student.department.name,
      },
    }));
  }

  async getProfile(lecturerId: string): Promise<LecturerProfileRes> {
    const lecturer = await this.prisma.lecturer.findUniqueOrThrow({
      where: { id: lecturerId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        otherName: true,
        title: true,
        phone: true,
        qualification: true,
        gender: true,
        department: { select: { name: true } },
        user: { select: { email: true } },
        designations: {
          select: {
            id:   true,
            role: true,
            part: true,
          },
        },
      },
    });

    return {
      ...lecturer,
      department: lecturer.department.name,
      email: lecturer.user.email,
    };
  }


  async getPendingApprovals(lecturerId: string) {
    // Fetch all REQUESTED requests for this lecturer with full flow context
    const requests = await this.prisma.approvalRequest.findMany({
      where: {
        status:              ApprovalStatus.REQUESTED,
        lecturerDesignation: { lecturerId },
      },
      include: {
        lecturerDesignation: { select: { role: true, part: true } },
        approvalFlow: {
          include: {
            // Need all requests in the flow to check ordering
            approvalRequests: {
              select:  { priority: true, status: true },
              orderBy: { priority: 'asc' },
            },
            courseSession: {
              include: {
                course:        { select: { code: true, title: true } },
                resultUploads: {
                  where:   { isProcessed: false },
                  select: {
                    id:         true,
                    url:        true,
                    filename:   true,
                    mimetype:   true,
                    resultType: true,
                    createdAt:  true,
                    uploadedBy: { select: { firstName: true, lastName: true } },
                  },
                  orderBy: { createdAt: 'desc' },
                  take: 1,
                },
              },
            },
            takingDepartment: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Filter out requests blocked by a lower-priority pending step
    return requests.filter((req) => {
      const allRequestsInFlow = req.approvalFlow.approvalRequests;

      const isBlocked = allRequestsInFlow.some(
        (other) =>
          other.priority < req.priority &&
          other.status !== ApprovalStatus.APPROVED,
      );
      return !isBlocked;
    });
  }

  async publishResults(
    courseSesnDeptLevelId: string,
    lecturerId: string,
  ): Promise<void> {
    const deptLevel = await this.prisma.courseSesnDeptAndLevel.findUnique({
      where: { id: courseSesnDeptLevelId },
      include: {
        courseSession: {
          include: { lecturers: true },
        },
      },
    });

    if (!deptLevel) {
      throw new NotFoundException(
        `CourseSesnDeptAndLevel ${courseSesnDeptLevelId} not found`,
      );
    }

    // Guard: lecturer must be assigned to this course session
    const isAssigned = deptLevel.courseSession.lecturers.some(
      (cl) => cl.lecturerId === lecturerId,
    );

    if (!isAssigned) {
      throw new ForbiddenException(
        'You are not assigned to this course session',
      );
    }

    // Guard: the approval flow for this specific dept+level must be APPROVED
    const approvalFlow = await this.prisma.approvalFlow.findFirst({
      where: {
        courseSessionId:    deptLevel.courseSessionId,
        takingDepartmentId: deptLevel.departmentId,
        level:              deptLevel.level,
        approvalStatus:     ApprovalStatus.APPROVED,
      },
    });

    if (!approvalFlow) {
      throw new BadRequestException(
        `The approval flow for this department/level is not fully approved yet`,
      );
    }

    // Guard: result must have been processed
    const resultUpload = await this.prisma.resultUpload.findUnique({
      where: {
        uniqueResultUpload: {
          courseSessionId:       deptLevel.courseSessionId,
          courseSesnDeptLevelId: courseSesnDeptLevelId,
        },
      },
      select: { isProcessed: true },
    });

    if (!resultUpload?.isProcessed) {
      throw new BadRequestException(
        `Results have not been processed yet for this department/level`,
      );
    }

    await this.prisma.courseSesnDeptAndLevel.update({
      where: { id: courseSesnDeptLevelId },
      data: {
        resultStatus: DeptResultStatus.PUBLISHED,
        publishedAt: new Date(),
      },
    });
  }
      
  
}
