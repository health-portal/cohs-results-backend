import { type PrismaClient, UserRole } from '@prisma/client';
import { createClient } from 'smtpexpress';
import { TokenPayload } from 'src/auth/auth.schema';

import {
  EmailSubject,
  setPasswordTemplate,
} from 'src/message-queue/message-queue.schema';
import * as jwt from 'jsonwebtoken';
import env from 'src/api.env.';

export default async function seedAdmins(prisma: PrismaClient) {
  const emailClient = createClient({
    projectId: env.SMTPEXPRESS_PROJECT_ID,
    projectSecret: env.SMTPEXPRESS_PROJECT_SECRET,
  });
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

    const createdUser = await prisma.user.create({
      data: {
        email: admin.email,
        role: UserRole.ADMIN,
        admin: {
          create: { name: admin.name },
        },
      },
    });

    const payload: TokenPayload = {
      sub: createdUser.id,
      email: createdUser.email,
      role: UserRole.ADMIN,
    };
    const token = jwt.sign(payload, env.JWT_SECRET, {
      expiresIn: '7d',
    });
    const url = new URL(env.FRONTEND_BASE_URL + '/activate-account');
    url.searchParams.set('token', token);

    await emailClient.sendApi.sendMail({
      subject: EmailSubject.ACTIVATE_ACCOUNT,
      message: setPasswordTemplate(true, url.toString()),
      sender: {
        name: 'Obafemi Awolowo University - College of Health Sciences',
        email: env.SMTPEXPRESS_SENDER_EMAIL,
      },
      recipients: [createdUser.email],
    });

    console.log(`→ Created Admin: ${admin.email}\n`);
  }

  console.log('=== Admin Seeding Completed ===\n');
}
