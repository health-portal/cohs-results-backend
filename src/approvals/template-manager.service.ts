import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { PipelineResolverService } from './pipeline-resolver.service';
import {
  ActivateTemplateDto,
  CreatePipelineTemplateDto,
} from './approval.dto';

@Injectable()
export class TemplateManagerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly resolver: PipelineResolverService,
    private readonly logger: Logger,
  ) {}

  // ============================================================
  // TEMPLATE CREATION
  // Dean creates a template — facultyId auto-resolved from their designation
  // ============================================================

  async createTemplate(dto: CreatePipelineTemplateDto) {
    await this.resolver.assertIsDeanOfFaculty(dto.createdByDeanId);

    const facultyId = await this.resolver.resolveFacultyFromDean(
      dto.createdByDeanId,
    );

    this.validateStepPriorities(dto.steps.map((s) => s.priority));

    const template = await this.prisma.pipelineTemplate.create({
      data: {
        name: dto.name,
        description: dto.description ?? null,
        createdByDeanId: dto.createdByDeanId,
        facultyId,
        isActive: false,
        steps: {
          create: dto.steps.map((step) => ({
            role:     step.role,
            priority: step.priority,
            scope:    step.scope,
            part:     step.level ?? null, // Level? — stored directly, no conversion
          })),
        },
      },
      include: { steps: { orderBy: { priority: 'asc' } } },
    });

    this.logger.log(
      `Template "${template.name}" created by dean ${dto.createdByDeanId} ` +
        `for faculty ${facultyId}`,
    );

    return template;
  }

  // ============================================================
  // TEMPLATE ACTIVATION
  // One active template per faculty — Dean can only activate for their own faculty
  // ============================================================

  async activateTemplate(dto: ActivateTemplateDto) {
    await this.resolver.assertIsDeanOfFaculty(dto.activatedByDeanId);

    const facultyId = await this.resolver.resolveFacultyFromDean(
      dto.activatedByDeanId,
    );

    const template = await this.prisma.pipelineTemplate.findUnique({
      where: { id: dto.templateId },
    });

    if (!template) {
      throw new NotFoundException(`Template ${dto.templateId} not found`);
    }

    // Guard: Dean can only activate templates belonging to their own faculty
    if (template.facultyId !== facultyId) {
      throw new BadRequestException(
        `Template ${dto.templateId} does not belong to your faculty`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      // Deactivate currently active template for this faculty
      const currentlyActive = await tx.pipelineTemplate.findFirst({
        where: { isActive: true, facultyId },
      });

      if (currentlyActive && currentlyActive.id !== dto.templateId) {
        await tx.pipelineTemplate.update({
          where: { id: currentlyActive.id },
          data: { isActive: false, deactivatedAt: new Date() },
        });

        await tx.pipelineTemplateActivation.updateMany({
          where: { pipelineTemplateId: currentlyActive.id, deactivatedAt: null },
          data: { deactivatedAt: new Date() },
        });

        this.logger.log(
          `Deactivated previous template "${currentlyActive.name}" for faculty ${facultyId}`,
        );
      }

      const activated = await tx.pipelineTemplate.update({
        where: { id: dto.templateId },
        data: {
          isActive: true,
          activatedAt: new Date(),
          activatedById: dto.activatedByDeanId,
          deactivatedAt: null,
        },
        include: { steps: { orderBy: { priority: 'asc' } } },
      });

      await tx.pipelineTemplateActivation.create({
        data: {
          pipelineTemplateId: dto.templateId,
          activatedById: dto.activatedByDeanId,
          facultyId,
          activatedAt: new Date(),
        },
      });

      this.logger.log(
        `Template "${activated.name}" activated for faculty ${facultyId} ` +
          `by dean ${dto.activatedByDeanId}`,
      );

      return activated;
    });
  }

  async deactivateTemplate(deanId: string) {
    await this.resolver.assertIsDeanOfFaculty(deanId);

    const facultyId = await this.resolver.resolveFacultyFromDean(deanId);

    return this.prisma.$transaction(async (tx) => {
      const currentlyActive = await tx.pipelineTemplate.findFirst({
        where: { isActive: true, facultyId },
      });

      if (!currentlyActive) {
        throw new NotFoundException(`No active template found for your faculty`);
      }

      await tx.pipelineTemplate.update({
        where: { id: currentlyActive.id },
        data: { isActive: false, deactivatedAt: new Date() },
      });

      await tx.pipelineTemplateActivation.updateMany({
        where: { pipelineTemplateId: currentlyActive.id, deactivatedAt: null },
        data: { deactivatedAt: new Date() },
      });

      this.logger.log(
        `Template "${currentlyActive.name}" deactivated by dean ${deanId}. ` +
          `Reverting to default fixed pipeline.`,
      );

      return { deactivated: currentlyActive.name };
    });
  }

  // ============================================================
  // QUERIES
  // ============================================================

  async getActivationHistory(facultyId: string) {
    return this.prisma.pipelineTemplateActivation.findMany({
      where: { facultyId },
      include: {
        pipelineTemplate: { select: { id: true, name: true, description: true } },
        activatedBy: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { activatedAt: 'desc' },
    });
  }

  async listTemplates(filters?: {
    createdByDeanId?: string;
    facultyId?: string;
    isActive?: boolean;
  }) {
    return this.prisma.pipelineTemplate.findMany({
      where: { ...filters },
      include: {
        steps: { orderBy: { priority: 'asc' } },
        createdBy: { select: { firstName: true, lastName: true } },
        activatedBy: { select: { firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getTemplate(templateId: string) {
    const template = await this.prisma.pipelineTemplate.findUnique({
      where: { id: templateId },
      include: {
        steps: { orderBy: { priority: 'asc' } },
        createdBy: { select: { firstName: true, lastName: true, title: true } },
        activatedBy: { select: { firstName: true, lastName: true } },
        activations: {
          orderBy: { activatedAt: 'desc' },
          take: 10,
          include: {
            activatedBy: { select: { firstName: true, lastName: true } },
          },
        },
      },
    });

    if (!template) {
      throw new NotFoundException(`Template ${templateId} not found`);
    }

    return template;
  }

  private validateStepPriorities(priorities: number[]): void {
    const unique = new Set(priorities);
    if (unique.size !== priorities.length) {
      throw new BadRequestException(
        'Duplicate priority levels in template steps. Each step must have a unique priority.',
      );
    }
  }
}