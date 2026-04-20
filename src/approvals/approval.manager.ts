import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ApprovalStatus, DeptResultStatus, Level } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { PipelineResolverService } from './pipeline-resolver.service';
import { RespondToApprovalRequestDto } from './approval.dto';
import type {
  IApprovalPipelineStatus,
  IApprovalStepStatus,
  IBuildPipelineResult,
  ICourseSessionContext,
  IPipelineStep,
} from './approval.types';

@Injectable()
export class ApprovalManager {
  constructor(
    private readonly prisma: PrismaService,
    private readonly resolver: PipelineResolverService,
    private readonly logger: Logger,
  ) {}

  async buildApprovalPipeline(
    courseSessionId: string, lecturerId: string
  ): Promise<IBuildPipelineResult> {
    const context =
      await this.resolver.resolveCourseSessionContext(courseSessionId);

    this.logger.log(
      `Building pipeline for course ${context.courseCode} ` +
        `[${context.courseType}] — ${context.takingDeptLevels.length} dept/level pair(s)`,
    );

    const template = await this.resolver.resolveActiveTemplate(
      context.offeringFacultyId,
    );

    const stepDefinitions: IPipelineStep[] = template
      ? template.steps
      : this.resolver.getDefaultSteps(context.courseType);

    this.logger.log(
      template
        ? `Using custom template: "${template.name}"`
        : `Using default fixed pipeline for ${context.courseType}`,
    );

    const flows: IBuildPipelineResult['flows'] = [];

    for (const deptLevel of context.takingDeptLevels) {
      const flow = await this.createFlowForDeptLevel(
        context,
        lecturerId,
        deptLevel.departmentId,
        deptLevel.departmentName,
        deptLevel.level,
        stepDefinitions,
        template?.id ?? null,
      );
      flows.push(flow);
    }
    for (const flow of flows) {
      const firstRequest = await this.getNextPendingRequest(flow.flowId);

      if (firstRequest) {
        const notificationPayload = {
          lecturerId: firstRequest.lecturerDesignation.lecturer.id,
          title:      'Result Awaiting Your Approval',
          message:    `A result has been uploaded for your review ` +
                      `as ${firstRequest.lecturerDesignation.role}. ` +
                      `Please log in and respond.`,
        };
        // await this.notificationService.send(notificationPayload);
      }
    }

    return {
      courseSessionId,
      courseType: context.courseType,
      templateUsed: template?.name ?? null,
      flows,
    };
  }

  /**
   * Create one ApprovalFlow + all ApprovalRequests for a (dept + level) pair.
   * Idempotent — safe to call again on result re-upload.
   */
  private async createFlowForDeptLevel(
    context: ICourseSessionContext,
    lecturerId: string,
    takingDeptId: string,
    takingDeptName: string,
    level: Level,
    steps: IPipelineStep[],
    templateId: string | null,
  ) {
    const resolvedSteps = await this.resolver.resolveStepsForFlow(
      steps,
      context.offeringDeptId,
      takingDeptId,
      level,
    );

    // return this.prisma.$transaction(async (tx) => {
    //   const flow = await tx.approvalFlow.upsert({
    //     where: {
    //       uniqueApprovalFlow: {
    //         courseSessionId: context.id,
    //         takingDepartmentId: takingDeptId,
    //         level,
    //       },
    //     },
    //     update: {},
    //     create: {
    //       courseSession:      { connect: { id: context.id } },
    //       offeringDepartment: { connect: { id: context.offeringDeptId } },
    //       takingDepartment:   { connect: { id: takingDeptId } },
    //       lecturer: { connect: { id: lecturerId } },
    //       level,
    //       courseType:       context.courseType,
    //       approvalStatus:   ApprovalStatus.REQUESTED,
    //       pipelineTemplate: templateId ? { connect: { id: templateId } } : undefined,
    //     },
    //   });

    //   for (const step of resolvedSteps) {
    //     await tx.approvalRequest.upsert({
    //       where: {
    //         approvalFlowId_lecturerDesignationId_priority: {
    //           approvalFlowId: flow.id,
    //           lecturerDesignationId: step.lecturerDesignationId,
    //           priority: step.priority,
    //         },
    //       },
    //       update: {},
    //       create: {
    //         approvalFlowId:        flow.id,
    //         lecturerDesignationId: step.lecturerDesignationId,
    //         priority:              step.priority,
    //         status:                ApprovalStatus.REQUESTED,
    //       },
    //     });

    //     this.logger.log(
    //       `ApprovalRequest → ${step.role} (${step.lecturerName}) ` +
    //         `for "${takingDeptName}" [${level}] at priority ${step.priority}`,
    //     );
    //   }

    //   return {
    //     flowId:              flow.id,
    //     takingDepartmentId:  takingDeptId,
    //     takingDepartmentName: takingDeptName,
    //     level,
    //     stepsCreated:        resolvedSteps.length,
    //   };
    // });

    // Inside createFlowForDeptLevel
    return this.prisma.$transaction(async (tx) => {
      const flow = await tx.approvalFlow.upsert({
            where: {
              uniqueApprovalFlow: {
                courseSessionId: context.id,
                takingDepartmentId: takingDeptId,
                level,
              },
            },
            update: {},
            create: {
              courseSession:      { connect: { id: context.id } },
              offeringDepartment: { connect: { id: context.offeringDeptId } },
              takingDepartment:   { connect: { id: takingDeptId } },
              lecturer: { connect: { id: lecturerId } },
              level,
              courseType:       context.courseType,
              approvalStatus:   ApprovalStatus.REQUESTED,
              pipelineTemplate: templateId ? { connect: { id: templateId } } : undefined,
            },
          });


      // 1. Prepare all the data first
      const requestsData = resolvedSteps.map(step => ({
        approvalFlowId: flow.id,
        lecturerDesignationId: step.lecturerDesignationId,
        priority: step.priority,
        status: ApprovalStatus.REQUESTED,
      }));

      // 2. Fire one single command to the DB instead of a loop
      await tx.approvalRequest.createMany({
        data: requestsData,
        skipDuplicates: true, 
      });

          return {
            flowId:              flow.id,
            takingDepartmentId:  takingDeptId,
            takingDepartmentName: takingDeptName,
            level,
            stepsCreated:        resolvedSteps.length,
          };
    }, {
      timeout: 15000 // Give it a bit more breathing room
    });
  }


  async respondToApprovalRequest(
    approvalRequestId: string,
    response: RespondToApprovalRequestDto,
  ) {
    const approvalRequest = await this.prisma.approvalRequest.findUnique({
      where: { id: approvalRequestId },
      include: {
        lecturerDesignation: {
          include: {
            lecturer: { include: { department: true } },
          },
        },
        approvalFlow: {
          include: {
            approvalRequests: { orderBy: { priority: 'asc' } },
          },
        },
      },
    });

    if (!approvalRequest) {
      throw new NotFoundException(`Approval request ${approvalRequestId} not found`);
    }

    await this.resolver.assertLecturerOwnsDesignation(
      approvalRequest.lecturerDesignationId,
      response.lecturerDesignationId,
    );

    if (approvalRequest.status !== ApprovalStatus.REQUESTED) {
      throw new BadRequestException(
        `This request is already ${approvalRequest.status} and cannot be modified`,
      );
    }

    const blockingRequest = approvalRequest.approvalFlow.approvalRequests.find(
      (req) =>
        req.priority < approvalRequest.priority &&
        req.status !== ApprovalStatus.APPROVED,
    );

    if (blockingRequest) {
      throw new BadRequestException(
        `A lower-priority step (priority ${blockingRequest.priority}) ` +
          `has status "${blockingRequest.status}" and must be resolved first`,
      );
    }

    const isLastStep =
      approvalRequest.approvalFlow.approvalRequests.filter(
        (req) =>
          req.id !== approvalRequestId &&
          req.status === ApprovalStatus.REQUESTED,
      ).length === 0;

    const isRejection = response.approvalStatus === ApprovalStatus.REJECTED;
    const lecturer = approvalRequest.lecturerDesignation.lecturer;

    return this.prisma.$transaction(async (tx) => {
  const updated = await tx.approvalRequest.update({
    where: { id: approvalRequestId },
    data: {
      status:      response.approvalStatus,
      feedback:    response.feedback ?? null,
      respondedAt: new Date(),
    },
  });
  if (isLastStep && !isRejection) {
    await tx.approvalFlow.update({
      where: { id: approvalRequest.approvalFlowId },
      data: { approvalStatus: ApprovalStatus.APPROVED },
    });

    await tx.courseSesnDeptAndLevel.update({
      where: {
        uniqueCourseSesnDeptAndLevel: { // This matches your @@unique index
          courseSessionId: approvalRequest.approvalFlow.courseSessionId,
          departmentId:    approvalRequest.approvalFlow.takingDepartmentId,
          level:           approvalRequest.approvalFlow.level,
        }
      },
      data: {
        resultStatus: DeptResultStatus.APPROVED, 
      }
    });
  }

  if (isRejection) {
   await tx.courseSesnDeptAndLevel.update({
    where: {
      uniqueCourseSesnDeptAndLevel: {
        courseSessionId: approvalRequest.approvalFlow.courseSessionId,
        departmentId:    approvalRequest.approvalFlow.takingDepartmentId,
        level:           approvalRequest.approvalFlow.level,
      }
    },
    data: {
      resultStatus: DeptResultStatus.REJECTED, 
    }
  });
  
   // Reset the entire flow so it starts from priority 1 again
  await this.resetApprovalFlow(approvalRequest.approvalFlowId);

  // Fetch the uploader (course lecturer) to notify them of rejection
  const resultUpload = await this.prisma.resultUpload.findFirst({
    where: {
      courseSession: {
        approvalFlows: { some: { id: approvalRequest.approvalFlowId } },
      },
    },
    include: {
      uploadedBy: true,
    },
  });

  if (resultUpload) {
    const notificationPayload = {
      lecturerId: resultUpload.uploadedById,
      title:      'Result Rejected',
      message:    `Your uploaded result was rejected by ${lecturer.title} ${lecturer.firstName} ${lecturer.lastName} ` +
                  `[${approvalRequest.lecturerDesignation.role}]. ` +
                  `Reason: ${response.feedback ?? 'No reason provided'}. ` +
                  `The approval flow has been reset — please review and re-upload.`,
    };
    // await this.notificationService.send(notificationPayload);
  }
} else if (!isLastStep) {
  const nextRequest = await this.getNextPendingRequest(
    approvalRequest.approvalFlowId,
  );

  if (nextRequest) {
    const notificationPayload = {
      lecturerId: nextRequest.lecturerDesignation.lecturer.id,
      title:      'Result Awaiting Your Approval',
      message:    `A result upload for course session requires your approval ` +
                  `as ${nextRequest.lecturerDesignation.role}. ` +
                  `Please review and respond.`,
    };
    // await this.notificationService.send(notificationPayload);
  }
} else {
  const resultUpload = await this.prisma.resultUpload.findFirst({
    where: {
      courseSession: {
        approvalFlows: { some: { id: approvalRequest.approvalFlowId } },
      },
    },
    include: { uploadedBy: true },
  });

  if (resultUpload) {
    const notificationPayload = {
      lecturerId: resultUpload.uploadedById,
      title:      'Result Fully Approved',
      message:    `Your uploaded result has been approved by all required parties.`,
    };
  }
}

  }
) 
}

  async checkApprovalPipelineStatus(
    approvalFlowId: string,
  ): Promise<IApprovalPipelineStatus> {
    const flow = await this.prisma.approvalFlow.findUnique({
      where: { id: approvalFlowId },
      include: {
        approvalRequests: {
          orderBy: { priority: 'asc' },
          include: {
            lecturerDesignation: {
              include: { lecturer: true },
            },
          },
        },
      },
    });

    if (!flow) {
      throw new NotFoundException(`Approval flow ${approvalFlowId} not found`);
    }

    const requests = flow.approvalRequests;

    if (!requests.length) {
      throw new BadRequestException(`Flow ${approvalFlowId} has no steps`);
    }

    const maxPriorityLevel = requests[requests.length - 1].priority;
    const currentStep = requests.find((r) => r.status !== ApprovalStatus.APPROVED);
    const rejectedStep = requests.find((r) => r.status === ApprovalStatus.REJECTED);

    const steps: IApprovalStepStatus[] = requests.map((req) => ({
      priority:    req.priority,
      role:        req.lecturerDesignation.role,
      lecturerName: `${req.lecturerDesignation.lecturer.firstName} ${req.lecturerDesignation.lecturer.lastName}`,
      status:      req.status,
      respondedAt: req.respondedAt ?? undefined,
      feedback:    req.feedback ?? undefined,
    }));

    return {
      flowId:              approvalFlowId,
      courseSessionId:     flow.courseSessionId,
      takingDepartmentId:  flow.takingDepartmentId,
      level:               flow.level,
      overallStatus:       flow.approvalStatus,
      currentPriorityLevel: currentStep?.priority ?? maxPriorityLevel,
      maxPriorityLevel,
      steps,
      rejectionFeedback:   rejectedStep?.feedback ?? undefined,
    };
  }

  async checkAllFlowsForCourseSession(courseSessionId: string) {
    const flows = await this.prisma.approvalFlow.findMany({
      where: { courseSessionId },
      include: {
        takingDepartment: { select: { name: true } },
        approvalRequests: {
          select: { status: true, priority: true },
          orderBy: { priority: 'asc' },
        },
      },
      orderBy: { takingDepartmentId: 'asc' },
    });

    return flows.map((flow) => ({
      flowId:              flow.id,
      takingDepartmentId:  flow.takingDepartmentId,
      takingDepartmentName: flow.takingDepartment.name,
      level:               flow.level,
      overallStatus:       flow.approvalStatus,
      courseType:          flow.courseType,
      totalSteps:          flow.approvalRequests.length,
      approvedSteps:       flow.approvalRequests.filter(
        (r) => r.status === ApprovalStatus.APPROVED,
      ).length,
    }));
  }

  async getApprovalAuditTrail(approvalFlowId: string) {
    const snapshots = await this.prisma.approvalSnapshot.findMany({
      where: { approvalRequest: { approvalFlowId } },
      include: { approvalRequest: { select: { priority: true } } },
      orderBy: { timestamp: 'asc' },
    });

    return snapshots.map((snap) => ({
      priority:       snap.approvalRequest.priority,
      lecturerName:   snap.lecturerName,
      roleHeld:       snap.roleHeld,
      departmentName: snap.departmentName,
      action:         snap.action,
      feedback:       snap.feedback,
      timestamp:      snap.timestamp,
    }));
  }


async resetApprovalFlow(approvalFlowId: string): Promise<void> {
  await this.prisma.$transaction(async (tx) => {
    await tx.approvalRequest.updateMany({
      where: { approvalFlowId },
      data: {
        status:      ApprovalStatus.REQUESTED,
        feedback:    null,
        respondedAt: null,
      },
    });

    await tx.approvalFlow.update({
      where: { id: approvalFlowId },
      data: { approvalStatus: ApprovalStatus.REQUESTED },
    });
  });
}

/**
 * Get the next pending ApprovalRequest in a flow (lowest priority with REQUESTED status).
 * Returns null if no pending requests remain.
 */
async getNextPendingRequest(approvalFlowId: string) {
  return this.prisma.approvalRequest.findFirst({
    where: {
      approvalFlowId,
      status: ApprovalStatus.REQUESTED,
    },
    orderBy: { priority: 'asc' },
    include: {
      lecturerDesignation: {
        include: { lecturer: true },
      },
    },
  });
}


async pendingFacultyApproval(departmentId: string) {
    const requests = await this.prisma.approvalRequest.findMany({
      where: {
        status: ApprovalStatus.REQUESTED,
        lecturerDesignation: {
          lecturer: { departmentId },
        },
      },
      include: {
        approvalFlow: {
          include: {
            courseSession: {
              include: {
                course:        { select: { code: true, title: true } },
                resultUploads: {
                  include: {
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
        lecturerDesignation: { select: { role: true, part: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  
    return this.mapPendingRequests(requests);
  
}
async pendingDepartmentApproval(facultyId: string) {
  
    const requests = await this.prisma.approvalRequest.findMany({
      where: {
        status: ApprovalStatus.REQUESTED,
        lecturerDesignation: {
          lecturer: {
            department: { facultyId },
          },
        },
      },
      include: {
        approvalFlow: {
          include: {
            courseSession: {
              include: {
                course:        { select: { code: true, title: true } },
                resultUploads: {
                  include: {
                    uploadedBy: { select: { firstName: true, lastName: true } },
                  },
                  orderBy: { createdAt: 'desc' },
                  take: 1,
                },
              },
            },
            takingDepartment: { select: { name: true } },
            offeringDepartment: { select: { name: true } },
          },
        },
        lecturerDesignation: {
          select: {
            role: true,
            part: true,
            lecturer: {
              select: {
                firstName:  true,
                lastName:   true,
                department: { select: { name: true } },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  
    return this.mapPendingRequests(requests, true);
}

private mapPendingRequests(requests: any[], includeDept = false) {
  return requests.map((req) => ({
    requestId:      req.id,
    priority:       req.priority,
    role:           req.lecturerDesignation.role,
    part:           req.lecturerDesignation.part,
    ...(includeDept && {
      assignedTo: `${req.lecturerDesignation.lecturer.firstName} ${req.lecturerDesignation.lecturer.lastName}`,
      department: req.lecturerDesignation.lecturer.department.name,
    }),
    takingDept:     req.approvalFlow.takingDepartment.name,
    ...(includeDept && {
      offeringDept: req.approvalFlow.offeringDepartment.name,
    }),
    level:          req.approvalFlow.level,
    courseCode:     req.approvalFlow.courseSession.course.code,
    courseTitle:    req.approvalFlow.courseSession.course.title,
    uploadedBy:     req.approvalFlow.courseSession.resultUploads[0]
                      ? `${req.approvalFlow.courseSession.resultUploads[0].uploadedBy.firstName} ${req.approvalFlow.courseSession.resultUploads[0].uploadedBy.lastName}`
                      : null,
    resultFile:     req.approvalFlow.courseSession.resultUploads[0]?.file ?? null,
    flowStatus:     req.approvalFlow.approvalStatus,
    createdAt:      req.createdAt,
  }));
}



}

