import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ApprovalRequest, ApprovalStatus, Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  IApprovalPipelineStatus,
  IApprovalRequestResponse,
  ICheckApprovalStatusResult,
} from './approval.types';

@Injectable()
export class ApprovalManager {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: Logger,
  ) {}

  /**
   * Initiate approval flow (idempotent)
   * @note always call since it's safely bounded
   * @param courseSessionId string
   * @param currentVersion number
   * @return approvalFlow
   */
  async initApprovalFlow(courseSessionId: string, currentVersion: number) {
    const approvalFlow = await this.prisma.approvalFlow.upsert({
      where: {
        uniqueApprovalFlow: {
          courseRequestVersion: currentVersion,
          courseSessionId,
        },
      },
      update: {},
      create: {
        courseSession: { connect: { id: courseSessionId } },
        courseRequestVersion: currentVersion,
      },
    });
    return approvalFlow;
  }

  /**
   * Retrieve latest (recent) approval flow
   * @note can be rejected/accepted so check status
   * @param courseSessionId,
   */
  async retrieveLatestApprovalFlow(courseSessionId: string) {
    const approvalFlow = await this.prisma.approvalFlow.findFirst({
      where: {
        courseSessionId,
      },
      orderBy: {
        courseRequestVersion: 'desc',
      },
    });
    return approvalFlow ?? this.initApprovalFlow(courseSessionId, 1);
  }

  static checkActiveApprovalFlow(
    approval: Prisma.ApprovalFlowGetPayload<{
      select: { approvalStatus: true };
    }>,
  ): boolean {
    const activeApprovalStatus: ApprovalStatus[] = ['REQUESTED'];
    return activeApprovalStatus.includes(approval.approvalStatus);
  }

  /**
   * add lecturer to flow pipeline
   * @param approvalFlowId string: the current approval flow, checks if active state
   * @param lecturerDesignationId string
   * @param priority number: the level of lect. which can follow the role enum
   * @note priority is in asc order so 1 is first round to approve
   */
  async addLecturerDesignationToApproval(
    approvalFlowId: string,
    lecturerDesignationId: string,
    priority: number,
  ) {
    const approval = await this.prisma.approvalFlow.findUnique({
      where: { id: approvalFlowId },
    });
    if (!approval || ApprovalManager.checkActiveApprovalFlow(approval)) {
      throw new Error('invalid approval flow, internal logic invalid');
    }
    const approvalRequest = await this.prisma.approvalRequest.create({
      data: {
        approvalFlowId,
        lecturerDesignationId,
        priority,
      },
    });
    // todo: some form of notification for lecturer
    this.logger.log(
      `New approval request for lecturer ${JSON.stringify(approvalRequest)}`,
    );
    return approvalRequest;
  }

  /**
   * respond to a request
   * @param approvalRequestId string
   * @param response IApprovalRequestResponse
   */
  async respondToApprovalRequest(
    approvalRequestId: string,
    response: IApprovalRequestResponse,
  ) {
    // check if this priority level can respond
    const approvalRequest = await this.prisma.approvalRequest.findUnique({
      where: {
        id: approvalRequestId,
        lecturerDesignationId: response.lecturerDesignationId,
      },
      include: {
        approvalFlow: {
          select: {
            approvalRequests: {
              where: { status: 'REQUESTED', id: { not: approvalRequestId } },
            },
          },
        },
      },
    });
    if (!approvalRequest)
      throw new NotFoundException('Approval request ID not found');
    const pendingApprovalRequestsAfterThis =
      approvalRequest.approvalFlow.approvalRequests.length;
    const invalidApprovalRequest = await this.prisma.approvalRequest.findFirst({
      where: {
        priority: { lt: approvalRequest.priority },
        status: { in: ['REQUESTED', 'REJECTED'] }, // meaning lower group hasn't agreed / rejected
      },
    });
    if (invalidApprovalRequest)
      throw new BadRequestException(
        `The approval request has pending/rejected request: ${invalidApprovalRequest.id}, status: ${invalidApprovalRequest.status}`,
      );
    // also check if is last status and update total flow
    return this.prisma.approvalRequest.update({
      where: { id: approvalRequestId },
      data: {
        status: response.approvalStatus,
        feedback: response.feedback,
        ...(pendingApprovalRequestsAfterThis == 0 ||
        response.approvalStatus === 'REJECTED'
          ? {
              approvalFlow: {
                update: {
                  data: { approvalStatus: response.approvalStatus },
                },
              },
            }
          : {}),
      },
    });
  }

  /**
   * check the status of the pipeline
   * @param approvalFlowId string
   */
  async checkApprovalPipelineStatus(
    approvalFlowId: string,
  ): Promise<IApprovalPipelineStatus> {
    // @ch1booze @Moyin-Olugbenga
    // todo: decide: use the approvalFlow status from db or use this manual check
    // cleanly fetch all requests and sort from db
    const approvalRequests = await this.prisma.approvalRequest.findMany({
      where: {
        approvalFlowId,
      },
      orderBy: {
        priority: 'asc', // !!!
      },
    });
    const matchedRequest = ApprovalManager.checkApprovalRequestsForStatus(
      approvalRequests,
      ['REJECTED', 'ACCEPTED'],
    );
    const lastPriorityLevel = approvalRequests[-1].priority; // need just last priority since ordered
    return {
      maxPriorityLevel: lastPriorityLevel,
      status: matchedRequest.foundStatus ?? 'REQUESTED',
      seekPriorityLevel: matchedRequest.priority ?? lastPriorityLevel,
      rejectionFeedback:
        matchedRequest.found && matchedRequest.foundStatus === 'REJECTED'
          ? approvalRequests[matchedRequest.index].feedback
          : undefined,
    };
  }

  // check by priority group for a status
  private static checkApprovalRequestsForStatus(
    approvalRequests: ApprovalRequest[],
    checkStatus: ApprovalStatus[],
  ): ICheckApprovalStatusResult {
    const matchedRequestIdx = approvalRequests.findIndex(
      (req) => checkStatus.includes[req.status],
    );
    const matchedRequest =
      matchedRequestIdx !== -1
        ? approvalRequests[matchedRequestIdx]
        : undefined;
    return {
      found: !!matchedRequest,
      index: matchedRequestIdx,
      priority: matchedRequest?.priority,
      approvalRequestId: matchedRequest?.id,
      foundStatus: matchedRequest?.status,
    };
  }
}
