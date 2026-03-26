import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ApprovalManager } from './approval.manager';
import { TemplateManagerService } from './template-manager.service';
import {
  ActivateTemplateDto,
  CreatePipelineTemplateDto,
  DeactivateTemplateDto,
  RespondToApprovalRequestDto,
} from './approval.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { UserRoleGuard } from 'src/auth/role.guard';

@ApiTags('Approval')
@Controller('approval')
@UseGuards(JwtAuthGuard, UserRoleGuard)
export class ApprovalController {
  constructor(
    private readonly approvalManager: ApprovalManager,
    private readonly templateManager: TemplateManagerService,
  ) {}

  // ============================================================
  // PIPELINE
  // ============================================================

  @Post('pipeline/:courseSessionId/build')
  @ApiOperation({
    summary: 'Build approval pipeline',
    description:
      'Triggered when a course lecturer uploads a result. Creates one flow per ' +
      '(dept + level) from CourseSesnDeptAndLevel. Template resolved at offering faculty level.',
  })
  @ApiParam({ name: 'courseSessionId', description: 'Course session ID' })
  @ApiResponse({ status: 201, description: 'Pipeline built successfully' })
  buildPipeline(@Param('courseSessionId') courseSessionId: string) {
    return this.approvalManager.buildApprovalPipeline(courseSessionId);
  }

  @Get('pipeline/:courseSessionId/status')
  @ApiOperation({
    summary: 'Get pipeline overview',
    description: 'Returns status of all dept/level flows for a course session.',
  })
  @ApiParam({ name: 'courseSessionId', description: 'Course session ID' })
  @ApiResponse({ status: 200, description: 'Pipeline status returned' })
  getCourseSessionStatus(@Param('courseSessionId') courseSessionId: string) {
    return this.approvalManager.checkAllFlowsForCourseSession(courseSessionId);
  }

  // ============================================================
  // FLOW
  // ============================================================

  @Get('flow/:flowId/status')
  @ApiOperation({
    summary: 'Get flow status',
    description: 'Detailed step-by-step status of a single (dept + level) flow.',
  })
  @ApiParam({ name: 'flowId', description: 'Approval flow ID' })
  @ApiResponse({ status: 200, description: 'Flow status returned' })
  getFlowStatus(@Param('flowId') flowId: string) {
    return this.approvalManager.checkApprovalPipelineStatus(flowId);
  }

  @Get('flow/:flowId/audit')
  @ApiOperation({
    summary: 'Get audit trail',
    description:
      'Immutable audit trail — who acted in what role and when. ' +
      'Frozen at time of action regardless of future role changes.',
  })
  @ApiParam({ name: 'flowId', description: 'Approval flow ID' })
  @ApiResponse({ status: 200, description: 'Audit trail returned' })
  getAuditTrail(@Param('flowId') flowId: string) {
    return this.approvalManager.getApprovalAuditTrail(flowId);
  }

  // ============================================================
  // APPROVAL REQUESTS
  // ============================================================

  @Patch('request/:requestId/respond')
  @ApiOperation({
    summary: 'Respond to approval request',
    description:
      'Lecturer approves or rejects their assigned step. ' +
      'All lower-priority steps must be APPROVED before this can be submitted.',
  })
  @ApiParam({ name: 'requestId', description: 'Approval request ID' })
  @ApiBody({ type: RespondToApprovalRequestDto })
  @ApiResponse({ status: 200, description: 'Response recorded successfully' })
  @ApiResponse({ status: 400, description: 'Lower-priority step not yet resolved' })
  @ApiResponse({ status: 404, description: 'Approval request not found' })
  respond(
    @Param('requestId') requestId: string,
    @Body() response: RespondToApprovalRequestDto,
  ) {
    return this.approvalManager.respondToApprovalRequest(requestId, response);
  }

  // ============================================================
  // TEMPLATES
  // ============================================================

  @Post('templates')
  @ApiOperation({
    summary: 'Create pipeline template',
    description:
      'Dean creates a custom approval template for their faculty. ' +
      'facultyId is auto-resolved from the Dean\'s designation — not passed in. ' +
      'Template is inactive by default until explicitly activated.',
  })
  @ApiBody({ type: CreatePipelineTemplateDto })
  @ApiResponse({ status: 201, description: 'Template created successfully' })
  @ApiResponse({ status: 403, description: 'Lecturer does not hold a DEAN designation' })
  createTemplate(@Body() dto: CreatePipelineTemplateDto) {
    return this.templateManager.createTemplate(dto);
  }

  @Get('templates')
  @ApiOperation({
    summary: 'List templates',
    description: 'List pipeline templates with optional filters.',
  })
  @ApiQuery({ name: 'createdByDeanId', required: false, description: 'Filter by Dean lecturer ID' })
  @ApiQuery({ name: 'facultyId', required: false, description: 'Filter by faculty ID' })
  @ApiQuery({ name: 'isActive', required: false, description: 'Filter by active status', enum: ['true', 'false'] })
  @ApiResponse({ status: 200, description: 'Templates returned' })
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

  @Get('templates/history/:facultyId')
  @ApiOperation({
    summary: 'Get template activation history',
    description: 'Full history of which template was active and when for a faculty.',
  })
  @ApiParam({ name: 'facultyId', description: 'Faculty ID' })
  @ApiResponse({ status: 200, description: 'Activation history returned' })
  getActivationHistory(@Param('facultyId') facultyId: string) {
    return this.templateManager.getActivationHistory(facultyId);
  }

  @Get('templates/:templateId')
  @ApiOperation({
    summary: 'Get single template',
    description: 'Returns a template with its steps and recent activation history.',
  })
  @ApiParam({ name: 'templateId', description: 'Template ID' })
  @ApiResponse({ status: 200, description: 'Template returned' })
  @ApiResponse({ status: 404, description: 'Template not found' })
  getTemplate(@Param('templateId') templateId: string) {
    return this.templateManager.getTemplate(templateId);
  }

  @Post('templates/activate')
  @ApiOperation({
    summary: 'Activate a template',
    description:
      'Dean activates a template for their faculty. ' +
      'Automatically deactivates the previously active template. ' +
      'Dean can only activate templates belonging to their own faculty.',
  })
  @ApiBody({ type: ActivateTemplateDto })
  @ApiResponse({ status: 201, description: 'Template activated successfully' })
  @ApiResponse({ status: 400, description: 'Template does not belong to Dean\'s faculty' })
  @ApiResponse({ status: 403, description: 'Lecturer does not hold a DEAN designation' })
  activateTemplate(@Body() dto: ActivateTemplateDto) {
    return this.templateManager.activateTemplate(dto);
  }

  @Post('templates/deactivate')
  @ApiOperation({
    summary: 'Deactivate active template',
    description:
      'Dean deactivates the currently active template for their faculty. ' +
      'System reverts to the default fixed pipeline (HOD → PART_ADVISER → HOD).',
  })
  @ApiBody({ type: DeactivateTemplateDto })
  @ApiResponse({ status: 201, description: 'Template deactivated successfully' })
  @ApiResponse({ status: 404, description: 'No active template found for faculty' })
  deactivateTemplate(@Body() dto: DeactivateTemplateDto) {
    return this.templateManager.deactivateTemplate(dto.deanId);
  }
}