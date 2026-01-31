import { BadRequestException, Injectable } from '@nestjs/common';
import {
  CreateGradingSystemBody,
  UpdateGradingSystemBody,
  UpsertGradingFieldsBody,
  UpsertGradingComputationsBody,
  UpsertGradingRangesBody,
  GradingSystemRes,
} from './grading-systems.schema';
import { PrismaService } from 'src/prisma/prisma.service';
import { Parser } from 'expr-eval';
import {
  GradingComputation,
  GradingField,
  GradingRange,
  ResultType,
} from '@prisma/client';

@Injectable()
export class GradingSystemsService {
  constructor(private readonly prisma: PrismaService) {}

  private hasUniqueValues<T>(arr: T[], key: keyof T): boolean {
    const seen = new Set();
    for (const item of arr) {
      const value = item[key];
      if (seen.has(value)) {
        return false;
      }
      seen.add(value);
    }
    return true;
  }

  async createGradingSystem({
    name,
    description,
    threshold,
  }: CreateGradingSystemBody) {
    await this.prisma.gradingSystem.create({
      data: { name, description, threshold },
    });
  }

  async getGradingSystems(): Promise<GradingSystemRes[]> {
    const foundGradingSystems = await this.prisma.gradingSystem.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        createdAt: true,
        updatedAt: true,
        deletedAt: true,
        name: true,
        description: true,
        threshold: true,
        _count: {
          select: { fields: true, computations: true, ranges: true },
        },
      },
    });

    return foundGradingSystems.map((gradingSystem) => ({
      id: gradingSystem.id,
      createdAt: gradingSystem.createdAt,
      updatedAt: gradingSystem.updatedAt,
      deletedAt: gradingSystem.deletedAt,
      name: gradingSystem.name,
      description: gradingSystem.description,
      threshold: gradingSystem.threshold,
      fieldsCount: gradingSystem._count.fields,
      computationsCount: gradingSystem._count.computations,
      rangesCount: gradingSystem._count.ranges,
    }));
  }

  async getGradingSystem(gradingSystemId: string): Promise<GradingSystemRes> {
    const foundGradingSystem =
      await this.prisma.gradingSystem.findUniqueOrThrow({
        where: { id: gradingSystemId },
        select: {
          id: true,
          createdAt: true,
          updatedAt: true,
          deletedAt: true,
          name: true,
          description: true,
          threshold: true,
          _count: {
            select: { fields: true, computations: true, ranges: true },
          },
        },
      });

    return {
      id: foundGradingSystem.id,
      createdAt: foundGradingSystem.createdAt,
      updatedAt: foundGradingSystem.updatedAt,
      deletedAt: foundGradingSystem.deletedAt,
      name: foundGradingSystem.name,
      description: foundGradingSystem.description,
      threshold: foundGradingSystem.threshold,
      fieldsCount: foundGradingSystem._count.fields,
      computationsCount: foundGradingSystem._count.computations,
      rangesCount: foundGradingSystem._count.ranges,
    };
  }

  async updateGradingSystem(
    gradingSystemId: string,
    { name, description, threshold }: UpdateGradingSystemBody,
  ) {
    await this.prisma.gradingSystem.update({
      where: { id: gradingSystemId },
      data: { name, description, threshold },
    });
  }

  async deleteGradingSystem(gradingSystemId: string) {
    await this.prisma.gradingSystem.update({
      where: { id: gradingSystemId },
      data: { deletedAt: new Date() },
    });
  }

  async upsertGradingFields(
    gradingSystemId: string,
    { fields }: UpsertGradingFieldsBody,
  ) {
    if (!this.hasUniqueValues(fields, 'variable'))
      throw new BadRequestException('Variable names must be unique');

    if (!this.hasUniqueValues(fields, 'label'))
      throw new BadRequestException('Labels must be unique');

    const totalWeight = fields.reduce((sum, field) => {
      const totalWeight = sum + field.weight;
      return totalWeight;
    }, 0);

    if (totalWeight !== 100)
      throw new BadRequestException('Total weight must be 100');

    await this.prisma.gradingField.deleteMany({ where: { gradingSystemId } });
    await this.prisma.gradingField.createMany({
      data: fields.map((field) => ({
        gradingSystemId,
        ...field,
      })),
    });
  }

  async getGradingFields(gradingSystemId: string) {
    return await this.prisma.gradingField.findMany({
      where: { gradingSystemId },
    });
  }

  async upsertGradingComputations(
    gradingSystemId: string,
    { computations }: UpsertGradingComputationsBody,
  ) {
    if (!this.hasUniqueValues(computations, 'variable'))
      throw new BadRequestException('Variable names must be unique');

    if (!this.hasUniqueValues(computations, 'label'))
      throw new BadRequestException('Labels must be unique');

    const foundGradingFields = await this.getGradingFields(gradingSystemId);
    const variables = foundGradingFields.map(
      (gradingField) => gradingField.variable,
    );
    const variablesSuperset = new Set([...variables, 'units']);

    const parser = new Parser();
    for (const computation of computations) {
      const parsedExpression = parser.parse(computation.expression);
      const parsedVariables = parsedExpression.variables();
      const invalidVariables = parsedVariables.filter(
        (variable) => !variablesSuperset.has(variable),
      );

      if (invalidVariables.length > 0) {
        throw new BadRequestException(
          `Invalid variables in expression: ${invalidVariables.join(', ')}`,
        );
      }
    }

    await this.prisma.gradingComputation.deleteMany({
      where: { gradingSystemId },
    });
    await this.prisma.gradingComputation.createMany({
      data: computations.map((computation) => ({
        gradingSystemId,
        ...computation,
      })),
    });
  }

  async getGradingComputations(gradingSystemId: string) {
    return await this.prisma.gradingComputation.findMany({
      where: { gradingSystemId },
    });
  }

  async upsertGradingRanges(
    gradingSystemId: string,
    { ranges }: UpsertGradingRangesBody,
  ) {
    if (!this.hasUniqueValues(ranges, 'label'))
      throw new BadRequestException('Labels must be unique');

    const sortedRanges = ranges.sort((a, b) => a.minScore - b.minScore);
    for (let i = 0; i < sortedRanges.length - 1; i++) {
      if (sortedRanges[i].maxScore !== sortedRanges[i + 1].minScore - 1)
        throw new BadRequestException('Ranges must be non-overlapping');
    }

    await this.prisma.gradingRange.deleteMany({ where: { gradingSystemId } });
    await this.prisma.gradingRange.createMany({
      data: ranges.map((range) => ({
        gradingSystemId,
        ...range,
      })),
    });
  }

  async getGradingRanges(gradingSystemId: string) {
    return await this.prisma.gradingRange.findMany({
      where: { gradingSystemId },
    });
  }

  async evaluateFromScores(
    enrollmentId: string,
    scores: Record<string, number>,
    gradingSystem: {
      computations: GradingComputation[];
      fields: GradingField[];
      ranges: GradingRange[];
    },
  ) {
    const scoresToGrade = Object.fromEntries(
      gradingSystem.fields.map((field) => [
        field.label,
        (scores[field.variable] / field.maxScore) * field.weight, // Scale score to weight which is a percentage
      ]),
    );

    const computationResults = Object.fromEntries(
      gradingSystem.computations.map((computation) => {
        const { expression } = computation;
        return [
          computation.variable,
          Parser.evaluate(expression, scoresToGrade),
        ];
      }),
    );

    // Extract grade label for score
    const matchedRange = gradingSystem.ranges.find(
      ({ minScore, maxScore }) =>
        computationResults.total >= minScore &&
        computationResults.total <= maxScore,
    );

    await this.prisma.result.update({
      where: { uniqueResult: { enrollmentId, type: ResultType.INITIAL } },
      data: {
        scores,
        evaluations: { ...computationResults, Grade: matchedRange },
      },
    });
  }
}
