import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { GradingSystemsService } from './grading-systems.service';
import {
  CreateGradingSystemBody,
  GradingField,
  GradingRange,
  GradingSystemRes,
  UpdateGradingSystemBody,
  UpsertGradingFieldsBody,
  UpsertGradingRangesBody,
} from './grading-systems.schema';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiBadRequestResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { AuthRoles, UserRoleGuard } from 'src/auth/role.guard';
import { UserRole } from '@prisma/client';

@ApiTags('grading-systems', 'Admin')
@ApiBearerAuth('accessToken')
@Controller('grading-systems')
@AuthRoles([UserRole.ADMIN])
@UseGuards(JwtAuthGuard, UserRoleGuard)
export class GradingSystemsController {
  constructor(private readonly gradingSystemsService: GradingSystemsService) {}

  @ApiOperation({ summary: 'Create a new grading system' })
  @ApiBody({ type: CreateGradingSystemBody })
  @ApiCreatedResponse({ description: 'Grading system created successfully' })
  @ApiBadRequestResponse({ description: 'Invalid grading system data' })
  @Post()
  async createGradingSystem(@Body() body: CreateGradingSystemBody) {
    return this.gradingSystemsService.createGradingSystem(body);
  }

  @ApiOperation({ summary: 'Get all grading systems' })
  @ApiOkResponse({ type: [GradingSystemRes] })
  @Get()
  async getGradingSystems() {
    return this.gradingSystemsService.getGradingSystems();
  }

  @ApiOperation({ summary: 'Get a grading system by ID' })
  @ApiParam({
    name: 'gradingSystemId',
    description: 'ID of the grading system',
  })
  @ApiOkResponse({ type: GradingSystemRes })
  @ApiNotFoundResponse({ description: 'Grading system not found' })
  @Get(':gradingSystemId')
  async getGradingSystem(@Param('gradingSystemId') gradingSystemId: string) {
    return this.gradingSystemsService.getGradingSystem(gradingSystemId);
  }

  @ApiOperation({ summary: 'Update a grading system' })
  @ApiParam({
    name: 'gradingSystemId',
    description: 'ID of the grading system to update',
  })
  @ApiBody({ type: UpdateGradingSystemBody })
  @ApiOkResponse({ description: 'Grading system updated successfully' })
  @ApiNotFoundResponse({ description: 'Grading system not found' })
  @Put(':gradingSystemId')
  async updateGradingSystem(
    @Param('gradingSystemId') gradingSystemId: string,
    @Body() body: UpdateGradingSystemBody,
  ) {
    return this.gradingSystemsService.updateGradingSystem(
      gradingSystemId,
      body,
    );
  }

  @ApiOperation({ summary: 'Delete a grading system' })
  @ApiParam({
    name: 'gradingSystemId',
    description: 'ID of the grading system to delete',
  })
  @ApiOkResponse({ description: 'Grading system deleted successfully' })
  @ApiNotFoundResponse({ description: 'Grading system not found' })
  @Delete(':gradingSystemId')
  async deleteGradingSystem(@Param('gradingSystemId') gradingSystemId: string) {
    return this.gradingSystemsService.deleteGradingSystem(gradingSystemId);
  }

  @ApiOperation({ summary: 'Create or update grading fields' })
  @ApiParam({
    name: 'gradingSystemId',
    description: 'ID of the grading system',
  })
  @ApiBody({ type: UpsertGradingFieldsBody })
  @ApiOkResponse({ description: 'Grading fields upserted successfully' })
  @ApiBadRequestResponse({ description: 'Invalid request body' })
  @ApiNotFoundResponse({ description: 'Grading system not found' })
  @Put(':gradingSystemId/fields')
  async upsertGradingFields(
    @Param('gradingSystemId') gradingSystemId: string,
    @Body() body: UpsertGradingFieldsBody,
  ) {
    return this.gradingSystemsService.upsertGradingFields(
      gradingSystemId,
      body,
    );
  }

  @ApiOperation({ summary: 'Get grading fields for a grading system' })
  @ApiParam({
    name: 'gradingSystemId',
    description: 'ID of the grading system',
  })
  @ApiOkResponse({ type: [GradingField] })
  @ApiNotFoundResponse({ description: 'Grading system not found' })
  @Get(':gradingSystemId/fields')
  async getGradingSystemFields(
    @Param('gradingSystemId') gradingSystemId: string,
  ) {
    return this.gradingSystemsService.getGradingFields(gradingSystemId);
  }

  @ApiOperation({ summary: 'Create or update grading ranges' })
  @ApiParam({
    name: 'gradingSystemId',
    description: 'ID of the grading system',
  })
  @ApiBody({ type: UpsertGradingRangesBody })
  @ApiOkResponse({ description: 'Grading ranges upserted successfully' })
  @ApiBadRequestResponse({ description: 'Invalid request body' })
  @ApiNotFoundResponse({ description: 'Grading system not found' })
  @Put(':gradingSystemId/ranges')
  async upsertGradingRanges(
    @Param('gradingSystemId') gradingSystemId: string,
    @Body() body: UpsertGradingRangesBody,
  ) {
    return this.gradingSystemsService.upsertGradingRanges(
      gradingSystemId,
      body,
    );
  }

  @ApiOperation({ summary: 'Get grading ranges for a grading system' })
  @ApiParam({
    name: 'gradingSystemId',
    description: 'ID of the grading system',
  })
  @ApiOkResponse({ type: [GradingRange] })
  @ApiNotFoundResponse({ description: 'Grading system not found' })
  @Get(':gradingSystemId/ranges')
  async getGradingRanges(@Param('gradingSystemId') gradingSystemId: string) {
    return this.gradingSystemsService.getGradingRanges(gradingSystemId);
  }
}
