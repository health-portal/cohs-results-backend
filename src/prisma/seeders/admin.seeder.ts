import { PrismaClient, UserRole } from '@prisma/client';
import { env } from 'src/lib/environment';

export default async function seedAdmins(prisma: PrismaClient) {
  console.log('\n=== Admin Seeding Started ===\n');

  for (const admin of env.DEFAULT_ADMINS) {
    console.log(`Checking Admin: ${admin.email}`);

    const foundUser = await prisma.user.findUnique({
      where: { email: admin.email },
    });

    if (foundUser) {
      console.log(`→ Admin already exists: ${admin.email}\n`);
      continue;
    }

    await prisma.user.create({
      data: {
        email: admin.email,
        role: UserRole.ADMIN,
        admin: {
          create: { name: admin.name },
        },
      },
    });

    // TODO: Send activation token
    console.log(`→ Created Admin: ${admin.email}\n`);
  }

  console.log('=== Admin Seeding Completed ===\n');
}
