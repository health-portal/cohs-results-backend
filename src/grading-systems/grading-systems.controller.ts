import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import { GradingSystemsService } from './grading-systems.service';
import {
  CreateGradingSystemBody,
  UpdateGradingSystemBody,
  UpsertGradingComputationsBody,
  UpsertGradingFieldsBody,
  UpsertGradingRangesBody,
} from './grading-systems.schema';

@Controller('grading-systems')
export class GradingSystemsController {
  constructor(private readonly gradingSystemsService: GradingSystemsService) {}

  @Post()
  async createGradingSystem(@Body() body: CreateGradingSystemBody) {
    return await this.gradingSystemsService.createGradingSystem(body);
  }

  @Get()
  async getGradingSystems() {
    return await this.gradingSystemsService.getGradingSystems();
  }

  @Get(':gradingSystemId')
  async getGradingSystem(@Param('gradingSystemId') gradingSystemId: string) {
    return await this.gradingSystemsService.getGradingSystem(gradingSystemId);
  }

  @Put(':gradingSystemId')
  async updateGradingSystem(
    @Param('gradingSystemId') gradingSystemId: string,
    @Body() body: UpdateGradingSystemBody,
  ) {
    return await this.gradingSystemsService.updateGradingSystem(
      gradingSystemId,
      body,
    );
  }

  @Delete(':gradingSystemId')
  async deleteGradingSystem(@Param('gradingSystemId') gradingSystemId: string) {
    return await this.gradingSystemsService.deleteGradingSystem(
      gradingSystemId,
    );
  }

  @Put(':gradingSystemId/fields')
  async upsertGradingFields(
    @Param('gradingSystemId') gradingSystemId: string,
    @Body() body: UpsertGradingFieldsBody,
  ) {
    return await this.gradingSystemsService.upsertGradingFields(
      gradingSystemId,
      body,
    );
  }

  @Get(':gradingSystemId/fields')
  async getGradingSystemFields(
    @Param('gradingSystemId') gradingSystemId: string,
  ) {
    return await this.gradingSystemsService.getGradingFields(gradingSystemId);
  }

  @Put(':gradingSystemId/computations')
  async upsertGradingComputations(
    @Param('gradingSystemId') gradingSystemId: string,
    @Body() body: UpsertGradingComputationsBody,
  ) {
    return await this.gradingSystemsService.upsertGradingComputations(
      gradingSystemId,
      body,
    );
  }

  @Get(':gradingSystemId/computations')
  async getGradingSystemComputations(
    @Param('gradingSystemId') gradingSystemId: string,
  ) {
    return await this.gradingSystemsService.getGradingComputations(
      gradingSystemId,
    );
  }

  @Put(':gradingSystemId/ranges')
  async upsertGradingRanges(
    @Param('gradingSystemId') gradingSystemId: string,
    @Body() body: UpsertGradingRangesBody,
  ) {
    return await this.gradingSystemsService.upsertGradingRanges(
      gradingSystemId,
      body,
    );
  }

  @Get(':gradingSystemId/ranges')
  async getGradingRanges(@Param('gradingSystemId') gradingSystemId: string) {
    return await this.gradingSystemsService.getGradingRanges(gradingSystemId);
  }
}
