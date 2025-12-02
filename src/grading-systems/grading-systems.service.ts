import { Injectable } from "@nestjs/common";
import type {
	CreateGradingSystemBody,
	UpdateGradingSystemBody,
	UpsertGradingFieldsBody,
	UpsertGradingComputationsBody,
	UpsertGradingRangesBody,
} from "./grading-systems.schema";
import type { PrismaService } from "src/prisma/prisma.service";

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
		return await this.prisma.gradingSystem.findMany({
			where: { deletedAt: null },
		});
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
}
