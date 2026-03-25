import {
  ApprovalStatus,
  CourseType,
  Level,
  LecturerRole,
  PipelineScope,
} from '@prisma/client';

// ============================================================
// PIPELINE STEP DEFINITIONS
// ============================================================

export interface IPipelineStep {
  role: LecturerRole;
  priority: number;
  scope: PipelineScope;
  level?: Level; // only for PART_ADVISER
}

// ============================================================
// COURSE SESSION CONTEXT
// One flow per (dept + level) from CourseSesnDeptAndLevel
// ============================================================

export interface ICourseSessionContext {
  id: string;
  courseCode: string;
  offeringDeptId: string;
  offeringDeptName: string;
  offeringFacultyId: string;
  courseType: CourseType;
  takingDeptLevels: ITakingDeptLevel[];
}

export interface ITakingDeptLevel {
  departmentId: string;
  departmentName: string;
  facultyId: string;
  level: Level;
}

// ============================================================
// APPROVAL REQUEST RESPONSE
// ============================================================

export interface IApprovalRequestResponse {
  lecturerDesignationId: string;
  approvalStatus: Extract<ApprovalStatus, 'APPROVED' | 'REJECTED'>;
  feedback?: string;
}

// ============================================================
// PIPELINE STATUS
// ============================================================

export interface IApprovalPipelineStatus {
  flowId: string;
  courseSessionId: string;
  takingDepartmentId: string;
  level: Level;
  overallStatus: ApprovalStatus;
  currentPriorityLevel: number;
  maxPriorityLevel: number;
  steps: IApprovalStepStatus[];
  rejectionFeedback?: string;
}

export interface IApprovalStepStatus {
  priority: number;
  role: LecturerRole;
  lecturerName: string;
  status: ApprovalStatus;
  respondedAt?: Date;
  feedback?: string;
}

// ============================================================
// TEMPLATE MANAGEMENT
// Always faculty-scoped — facultyId resolved from Dean's own designation
// ============================================================

export interface ICreatePipelineTemplateDto {
  name: string;
  description?: string;
  createdByDeanId: string; // lecturerId of the Dean
  steps: ICreatePipelineStepDto[];
}

export interface ICreatePipelineStepDto {
  role: LecturerRole;
  priority: number;
  scope: PipelineScope;
  level?: Level; // only for PART_ADVISER steps
}

export interface IActivateTemplateDto {
  templateId: string;
  activatedByDeanId: string; // lecturerId of the Dean
}

// ============================================================
// PIPELINE BUILD RESULT
// ============================================================

export interface IBuildPipelineResult {
  courseSessionId: string;
  courseType: CourseType;
  templateUsed: string | null;
  flows: IFlowSummary[];
}

export interface IFlowSummary {
  flowId: string;
  takingDepartmentId: string;
  takingDepartmentName: string;
  level: Level;
  stepsCreated: number;
}

// ============================================================
// INTERNAL RESOLUTION
// ============================================================

export interface IResolvedStep {
  lecturerDesignationId: string;
  lecturerId: string;
  lecturerName: string;
  role: LecturerRole;
  departmentId: string;
  priority: number;
}

// Maps Level enum to integer stored on LecturerDesignation.part
export const LEVEL_TO_PART: Record<Level, number> = {
  LVL_100: 100,
  LVL_200: 200,
  LVL_300: 300,
  LVL_400: 400,
  LVL_500: 500,
  LVL_600: 600,
  LVL_700: 700,
};