import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApprovalManager } from './approval.manager';
import { TemplateManagerService } from './template-manager.service';
import type {
  IActivateTemplateDto,
  IApprovalRequestResponse,
  ICreatePipelineTemplateDto,
} from './approval.types';

@Controller('approval')
export class ApprovalController {
  constructor(
    private readonly approvalManager: ApprovalManager,
    private readonly templateManager: TemplateManagerService,
  ) {}

  // ============================================================
  // PIPELINE — triggered by result upload
  // ============================================================

  /**
   * POST /approval/pipeline/:courseSessionId/build
   * Builds one flow per (dept + level) from CourseSesnDeptAndLevel.
   * Template resolved at offering faculty level.
   */
  @Post('pipeline/:courseSessionId/build')
  buildPipeline(@Param('courseSessionId') courseSessionId: string) {
    return this.approvalManager.buildApprovalPipeline(courseSessionId);
  }

  /**
   * GET /approval/pipeline/:courseSessionId/status
   * Overview of all flows for a course session.
   */
  @Get('pipeline/:courseSessionId/status')
  getCourseSessionStatus(@Param('courseSessionId') courseSessionId: string) {
    return this.approvalManager.checkAllFlowsForCourseSession(courseSessionId);
  }

  // ============================================================
  // FLOW — per (dept + level)
  // ============================================================

  /**
   * GET /approval/flow/:flowId/status
   * Detailed step-by-step status of a single flow.
   */
  @Get('flow/:flowId/status')
  getFlowStatus(@Param('flowId') flowId: string) {
    return this.approvalManager.checkApprovalPipelineStatus(flowId);
  }

  /**
   * GET /approval/flow/:flowId/audit
   * Immutable audit trail for a flow.
   */
  @Get('flow/:flowId/audit')
  getAuditTrail(@Param('flowId') flowId: string) {
    return this.approvalManager.getApprovalAuditTrail(flowId);
  }

  // ============================================================
  // APPROVAL REQUESTS
  // ============================================================

  /**
   * PATCH /approval/request/:requestId/respond
   * Lecturer approves or rejects their assigned step.
   */
  @Patch('request/:requestId/respond')
  respond(
    @Param('requestId') requestId: string,
    @Body() response: IApprovalRequestResponse,
  ) {
    return this.approvalManager.respondToApprovalRequest(requestId, response);
  }

  // ============================================================
  // TEMPLATES — Dean-managed, always faculty-scoped
  // ============================================================

  /**
   * POST /approval/templates
   * Dean creates a template for their own faculty.
   * facultyId is auto-resolved — not passed in by the caller.
   */
  @Post('templates')
  createTemplate(@Body() dto: ICreatePipelineTemplateDto) {
    return this.templateManager.createTemplate(dto);
  }

  /**
   * GET /approval/templates
   * List templates with optional filters.
   */
  @Get('templates')
  listTemplates(
    @Query('createdByDeanId') createdByDeanId?: string,
    @Query('facultyId') facultyId?: string,
    @Query('isActive') isActive?: string,
  ) {
    return this.templateManager.listTemplates({
      createdByDeanId,
      facultyId,
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
    });
  }

  /**
   * GET /approval/templates/:templateId
   * Single template with steps and activation history.
   */
  @Get('templates/:templateId')
  getTemplate(@Param('templateId') templateId: string) {
    return this.templateManager.getTemplate(templateId);
  }

  /**
   * POST /approval/templates/activate
   * Dean activates a template for their faculty.
   * Deactivates the previously active template automatically.
   */
  @Post('templates/activate')
  activateTemplate(@Body() dto: IActivateTemplateDto) {
    return this.templateManager.activateTemplate(dto);
  }

  /**
   * POST /approval/templates/deactivate
   * Dean deactivates the active template — reverts to default pipeline.
   */
  @Post('templates/deactivate')
  deactivateTemplate(@Body() body: { deanId: string }) {
    return this.templateManager.deactivateTemplate(body.deanId);
  }

  /**
   * GET /approval/templates/history/:facultyId
   * Full activation history for a faculty.
   */
  @Get('templates/history/:facultyId')
  getActivationHistory(@Param('facultyId') facultyId: string) {
    return this.templateManager.getActivationHistory(facultyId);
  }
}