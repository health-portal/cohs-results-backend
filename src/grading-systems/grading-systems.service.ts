import { BadRequestException, Injectable } from '@nestjs/common';
import {
  CreateGradingSystemBody,
  UpdateGradingSystemBody,
  UpsertGradingFieldsBody,
  UpsertGradingComputationsBody,
  UpsertGradingRangesBody,
} from './grading-systems.schema';
import { PrismaService } from 'src/prisma/prisma.service';
import { Parser } from 'expr-eval';
import { hasUniqueValues } from 'src/lib/utils';
import {
  GradingComputation,
  GradingField,
  GradingRange,
  ResultType,
} from '@prisma/client';

@Injectable()
export class GradingSystemsService {
  constructor(private readonly prisma: PrismaService) {}

  async createGradingSystem({
    name,
    description,
    threshold,
  }: CreateGradingSystemBody) {
    await this.prisma.gradingSystem.create({
      data: { name, description, threshold },
    });
  }

  async getGradingSystems() {
    const foundGradingSystem = await this.prisma.gradingSystem.findMany({
      where: { deletedAt: null },
    });

    return foundGradingSystem;
  }

  async getGradingSystem(gradingSystemId: string) {
    return await this.prisma.gradingSystem.findUnique({
      where: { id: gradingSystemId },
    });
  }

  async updateGradingSystem(
    gradingSystemId: string,
    { name, description }: UpdateGradingSystemBody,
  ) {
    await this.prisma.gradingSystem.update({
      where: { id: gradingSystemId },
      data: { name, description },
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
    if (!hasUniqueValues(fields, 'variable'))
      throw new BadRequestException('Variable names must be unique');

    if (!hasUniqueValues(fields, 'label'))
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
    if (!hasUniqueValues(computations, 'variable'))
      throw new BadRequestException('Variable names must be unique');

    if (!hasUniqueValues(computations, 'label'))
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
    if (!hasUniqueValues(ranges, 'label'))
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
