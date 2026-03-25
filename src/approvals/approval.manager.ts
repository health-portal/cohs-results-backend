import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ApprovalStatus, Level } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { PipelineResolverService } from './pipeline-resolver.service';
import type {
  IApprovalPipelineStatus,
  IApprovalRequestResponse,
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

  // ============================================================
  // PIPELINE BUILDING
  // One flow per (dept + level) from CourseSesnDeptAndLevel
  // Template is resolved at faculty level (offering faculty)
  // ============================================================

  async buildApprovalPipeline(
    courseSessionId: string,
  ): Promise<IBuildPipelineResult> {
    const context =
      await this.resolver.resolveCourseSessionContext(courseSessionId);

    this.logger.log(
      `Building pipeline for course ${context.courseCode} ` +
        `[${context.courseType}] — ${context.takingDeptLevels.length} dept/level pair(s)`,
    );

    // Template resolved at offering faculty level
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
        deptLevel.departmentId,
        deptLevel.departmentName,
        deptLevel.level,
        stepDefinitions,
        template?.id ?? null,
      );
      flows.push(flow);
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
          level,
          courseType:       context.courseType,
          approvalStatus:   ApprovalStatus.REQUESTED,
          pipelineTemplate: templateId ? { connect: { id: templateId } } : undefined,
        },
      });

      for (const step of resolvedSteps) {
        await tx.approvalRequest.upsert({
          where: {
            approvalFlowId_lecturerDesignationId_priority: {
              approvalFlowId: flow.id,
              lecturerDesignationId: step.lecturerDesignationId,
              priority: step.priority,
            },
          },
          update: {},
          create: {
            approvalFlowId:        flow.id,
            lecturerDesignationId: step.lecturerDesignationId,
            priority:              step.priority,
            status:                ApprovalStatus.REQUESTED,
          },
        });

        this.logger.log(
          `ApprovalRequest → ${step.role} (${step.lecturerName}) ` +
            `for "${takingDeptName}" [${level}] at priority ${step.priority}`,
        );
      }

      return {
        flowId:              flow.id,
        takingDepartmentId:  takingDeptId,
        takingDepartmentName: takingDeptName,
        level,
        stepsCreated:        resolvedSteps.length,
      };
    });
  }

  // ============================================================
  // RESPONDING TO APPROVAL REQUESTS
  // ============================================================

  async respondToApprovalRequest(
    approvalRequestId: string,
    response: IApprovalRequestResponse,
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

    // All lower-priority steps must be APPROVED first
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

      if (isLastStep || isRejection) {
        await tx.approvalFlow.update({
          where: { id: approvalRequest.approvalFlowId },
          data: { approvalStatus: response.approvalStatus },
        });
      }

      // Immutable audit snapshot
      await tx.approvalSnapshot.create({
        data: {
          approvalRequestId,
          lecturerId:     lecturer.id,
          lecturerName:   `${lecturer.firstName} ${lecturer.lastName}`,
          roleHeld:       approvalRequest.lecturerDesignation.role,
          departmentId:   lecturer.departmentId,
          departmentName: lecturer.department.name,
          action:         response.approvalStatus,
          feedback:       response.feedback ?? null,
          timestamp:      new Date(),
        },
      });

      this.logger.log(
        `Snapshot: ${lecturer.firstName} ${lecturer.lastName} ` +
          `[${approvalRequest.lecturerDesignation.role}] → ${response.approvalStatus}`,
      );

      return updated;
    });
  }

  // ============================================================
  // STATUS & AUDIT
  // ============================================================

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
}