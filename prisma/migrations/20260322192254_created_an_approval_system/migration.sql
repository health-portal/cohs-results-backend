/*
  Warnings:

  - A unique constraint covering the columns `[entity,role,lecturerId,part]` on the table `lecturer_designations` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "CourseType" AS ENUM ('INTRA', 'INTER');

-- CreateEnum
CREATE TYPE "PipelineScope" AS ENUM ('OFFERING_DEPT', 'TAKING_DEPT');

-- CreateEnum
CREATE TYPE "TemplateScopeType" AS ENUM ('DEPARTMENT', 'FACULTY');

-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('PENDING', 'REQUESTED', 'APPROVED', 'REJECTED');

-- AlterEnum
ALTER TYPE "LecturerRole" ADD VALUE 'COURSE_LECTURER';

-- DropIndex
DROP INDEX "lecturer_designations_entity_role_lecturerId_key";

-- AlterTable
ALTER TABLE "lecturer_designations" ADD COLUMN     "part" "Level";

-- CreateTable
CREATE TABLE "pipeline_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdByDeanId" TEXT NOT NULL,
    "scopeType" "TemplateScopeType" NOT NULL,
    "departmentId" TEXT,
    "facultyId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "activatedAt" TIMESTAMP(3),
    "activatedById" TEXT,
    "deactivatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pipeline_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pipeline_template_steps" (
    "id" TEXT NOT NULL,
    "pipelineTemplateId" TEXT NOT NULL,
    "role" "LecturerRole" NOT NULL,
    "priority" INTEGER NOT NULL,
    "scope" "PipelineScope" NOT NULL,
    "part" INTEGER,

    CONSTRAINT "pipeline_template_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pipeline_template_activations" (
    "id" TEXT NOT NULL,
    "pipelineTemplateId" TEXT NOT NULL,
    "activatedById" TEXT NOT NULL,
    "scopeType" "TemplateScopeType" NOT NULL,
    "departmentId" TEXT,
    "facultyId" TEXT,
    "activatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deactivatedAt" TIMESTAMP(3),

    CONSTRAINT "pipeline_template_activations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "approval_flows" (
    "id" TEXT NOT NULL,
    "courseSessionId" TEXT NOT NULL,
    "offeringDepartmentId" TEXT NOT NULL,
    "takingDepartmentId" TEXT NOT NULL,
    "courseRequestVersion" INTEGER NOT NULL,
    "courseType" "CourseType" NOT NULL,
    "approvalStatus" "ApprovalStatus" NOT NULL DEFAULT 'REQUESTED',
    "pipelineTemplateId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "approval_flows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "approval_requests" (
    "id" TEXT NOT NULL,
    "approvalFlowId" TEXT NOT NULL,
    "lecturerDesignationId" TEXT NOT NULL,
    "priority" INTEGER NOT NULL,
    "status" "ApprovalStatus" NOT NULL DEFAULT 'REQUESTED',
    "feedback" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),

    CONSTRAINT "approval_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "approval_snapshots" (
    "id" TEXT NOT NULL,
    "approvalRequestId" TEXT NOT NULL,
    "lecturerId" TEXT NOT NULL,
    "lecturerName" TEXT NOT NULL,
    "roleHeld" "LecturerRole" NOT NULL,
    "departmentId" TEXT NOT NULL,
    "departmentName" TEXT NOT NULL,
    "action" "ApprovalStatus" NOT NULL,
    "feedback" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "approval_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "pipeline_template_steps_pipelineTemplateId_priority_key" ON "pipeline_template_steps"("pipelineTemplateId", "priority");

-- CreateIndex
CREATE INDEX "approval_flows_courseSessionId_approvalStatus_idx" ON "approval_flows"("courseSessionId", "approvalStatus");

-- CreateIndex
CREATE UNIQUE INDEX "approval_flows_courseSessionId_takingDepartmentId_courseReq_key" ON "approval_flows"("courseSessionId", "takingDepartmentId", "courseRequestVersion");

-- CreateIndex
CREATE INDEX "approval_requests_approvalFlowId_priority_status_idx" ON "approval_requests"("approvalFlowId", "priority", "status");

-- CreateIndex
CREATE UNIQUE INDEX "approval_requests_approvalFlowId_lecturerDesignationId_prio_key" ON "approval_requests"("approvalFlowId", "lecturerDesignationId", "priority");

-- CreateIndex
CREATE UNIQUE INDEX "approval_snapshots_approvalRequestId_key" ON "approval_snapshots"("approvalRequestId");

-- CreateIndex
CREATE INDEX "lecturer_designations_role_lecturerId_idx" ON "lecturer_designations"("role", "lecturerId");

-- CreateIndex
CREATE UNIQUE INDEX "lecturer_designations_entity_role_lecturerId_part_key" ON "lecturer_designations"("entity", "role", "lecturerId", "part");

-- AddForeignKey
ALTER TABLE "pipeline_templates" ADD CONSTRAINT "pipeline_templates_createdByDeanId_fkey" FOREIGN KEY ("createdByDeanId") REFERENCES "lecturers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pipeline_templates" ADD CONSTRAINT "pipeline_templates_activatedById_fkey" FOREIGN KEY ("activatedById") REFERENCES "lecturers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pipeline_templates" ADD CONSTRAINT "pipeline_templates_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pipeline_templates" ADD CONSTRAINT "pipeline_templates_facultyId_fkey" FOREIGN KEY ("facultyId") REFERENCES "faculties"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pipeline_template_steps" ADD CONSTRAINT "pipeline_template_steps_pipelineTemplateId_fkey" FOREIGN KEY ("pipelineTemplateId") REFERENCES "pipeline_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pipeline_template_activations" ADD CONSTRAINT "pipeline_template_activations_pipelineTemplateId_fkey" FOREIGN KEY ("pipelineTemplateId") REFERENCES "pipeline_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pipeline_template_activations" ADD CONSTRAINT "pipeline_template_activations_activatedById_fkey" FOREIGN KEY ("activatedById") REFERENCES "lecturers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pipeline_template_activations" ADD CONSTRAINT "pipeline_template_activations_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pipeline_template_activations" ADD CONSTRAINT "pipeline_template_activations_facultyId_fkey" FOREIGN KEY ("facultyId") REFERENCES "faculties"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_flows" ADD CONSTRAINT "approval_flows_courseSessionId_fkey" FOREIGN KEY ("courseSessionId") REFERENCES "course_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_flows" ADD CONSTRAINT "approval_flows_offeringDepartmentId_fkey" FOREIGN KEY ("offeringDepartmentId") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_flows" ADD CONSTRAINT "approval_flows_takingDepartmentId_fkey" FOREIGN KEY ("takingDepartmentId") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_flows" ADD CONSTRAINT "approval_flows_pipelineTemplateId_fkey" FOREIGN KEY ("pipelineTemplateId") REFERENCES "pipeline_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_requests" ADD CONSTRAINT "approval_requests_approvalFlowId_fkey" FOREIGN KEY ("approvalFlowId") REFERENCES "approval_flows"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_requests" ADD CONSTRAINT "approval_requests_lecturerDesignationId_fkey" FOREIGN KEY ("lecturerDesignationId") REFERENCES "lecturer_designations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_snapshots" ADD CONSTRAINT "approval_snapshots_approvalRequestId_fkey" FOREIGN KEY ("approvalRequestId") REFERENCES "approval_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
