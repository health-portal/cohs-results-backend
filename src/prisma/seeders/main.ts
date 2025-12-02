import { PrismaClient } from "@prisma/client";
import seedAdmins from "./admin.seeder";
import seedFacultiesAndDepartments from "./faculties-and-depts.seeder";
import seedLecturerDesignations from "./lecturer-designations.seeder";

async function main() {
	const prisma = new PrismaClient();

	try {
		console.log("\n====================================");
		console.log("🚀 Starting Database Seeding Process");
		console.log("====================================\n");

		await seedAdmins(prisma);
		await seedFacultiesAndDepartments(prisma);
		await seedLecturerDesignations(prisma);

		console.log("✅ Database Seeding Completed Successfully.\n");
	} catch (error) {
		console.error("\n❌ Error Seeding Database:\n", error);
		process.exit(1);
	} finally {
		console.log("Disconnecting Prisma Client...\n");
		await prisma.$disconnect();
		console.log("✅ Prisma Client Disconnected.\n");
	}
}

main();
