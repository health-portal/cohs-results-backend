import { ApprovalStatus } from '@prisma/client';

// The current status of the pipeline
export interface IApprovalPipelineStatus {
  status: ApprovalStatus;
  seekPriorityLevel: number;
  maxPriorityLevel: number;
  rejectionFeedback?: string | null;
}

export interface ICheckApprovalStatusResult {
  found: boolean;
  index: number;
  priority?: number;
  approvalRequestId?: string;
  foundStatus?: ApprovalStatus;
}

export interface IApprovalRequestResponse {
  lecturerDesignationId: string;
  // either accepted/rejected of ApprovalStatus enum
  approvalStatus: Exclude<ApprovalStatus, 'REQUESTED'>;
  feedback?: string; // note: required for Rejected
}
