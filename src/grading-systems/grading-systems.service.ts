import { BadRequestException, Injectable } from '@nestjs/common';
import {
  CreateGradingSystemBody,
  UpdateGradingSystemBody,
  UpsertGradingFieldsBody,
  UpsertGradingRangesBody,
} from './grading-systems.schema';
import { PrismaService } from 'src/prisma/prisma.service';
import { GradingField, GradingRange, ResultType } from '@prisma/client';
import * as changeCase from 'change-case';

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

  async getGradingSystems() {
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
          select: { fields: true, ranges: true },
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
      rangesCount: gradingSystem._count.ranges,
    }));
  }

  async getGradingSystem(gradingSystemId: string) {
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
            select: { fields: true, ranges: true },
          },
        },
      });

    return {
      id: foundGradingSystem.id,
      createdAt: foundGradingSystem.createdAt,
      updatedAt: foundGradingSystem.updatedAt,
      deletedAt: foundGradingSystem.deletedAt,
      name: foundGradingSystem.name,
      description: foundGradingSystem.description ?? '',
      threshold: foundGradingSystem.threshold,
      fieldsCount: foundGradingSystem._count.fields,
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
    if (!this.hasUniqueValues(fields, 'label'))
      throw new BadRequestException('Labels must be unique');

    const totalWeight = fields.reduce((sum, field) => {
      const totalWeight = sum + field.weight;
      return totalWeight;
    }, 0);

    if (totalWeight !== 100)
      throw new BadRequestException('Total weight must be 100');

    await this.prisma.$transaction(async (tx) => {
      await tx.gradingField.deleteMany({ where: { gradingSystemId } });
      await tx.gradingField.createMany({
        data: fields.map((field) => {
          return {
            gradingSystemId,
            label: field.label,
            maxScore: field.maxScore,
            weight: field.weight,
            variable: changeCase.snakeCase(field.label),
            description: field.description,
          };
        }),
      });
    });
  }

  async getGradingFields(gradingSystemId: string) {
    return await this.prisma.gradingField.findMany({
      where: { gradingSystemId },
    });
  }

  async upsertGradingRanges(
    gradingSystemId: string,
    { ranges }: UpsertGradingRangesBody,
  ) {
    const gradingSytem = await this.prisma.gradingSystem.findUniqueOrThrow({
      where: { id: gradingSystemId },
      select: {
        threshold: true,
        _count: {
          select: {
            fields: true,
          },
        },
      },
    });

    if (!gradingSytem._count.fields)
      throw new BadRequestException('Grading fields not set');

    if (!this.hasUniqueValues(ranges, 'label'))
      throw new BadRequestException('Labels must be unique');

    const sortedRanges = ranges.sort((a, b) => a.minScore - b.minScore);
    if (sortedRanges[0].minScore !== gradingSytem.threshold)
      throw new BadRequestException(
        `Ranges must start from grading system threshold: ${gradingSytem.threshold}`,
      );

    for (let i = 0; i < sortedRanges.length - 1; i++) {
      if (sortedRanges[i].maxScore !== sortedRanges[i + 1].minScore - 1)
        throw new BadRequestException('Ranges must be non-overlapping');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.gradingRange.deleteMany({ where: { gradingSystemId } });
      await tx.gradingRange.createMany({
        data: ranges.map((range) => ({
          gradingSystemId,
          ...range,
        })),
      });
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

    const total = Object.values(scoresToGrade).reduce(
      (acc, score) => acc + score,
      0,
    );

    // Extract grade label for score
    const matchedRange = gradingSystem.ranges.find(
      ({ minScore, maxScore }) => total >= minScore && total <= maxScore,
    );

    await this.prisma.result.update({
      where: { uniqueResult: { enrollmentId, type: ResultType.INITIAL } },
      data: {
        scores,
        evaluations: { total, Grade: matchedRange },
      },
    });
  }
}
