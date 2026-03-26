import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  ActivateFixtureLecturersBody,
  AddAdminBody,
  UpdateAdminBody,
  UpdateLecturerDesignationDto,
} from './admin.dto';
import { LecturerRole, UserRole } from '@prisma/client';
import { MessageQueueService } from 'src/message-queue/message-queue.service';
import { AdminProfileRes } from './admin.responses';
import * as argon2 from 'argon2';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly messageQueueService: MessageQueueService,
  ) {}

  async addAdmin({ email, name }: AddAdminBody) {
    const user = await this.prisma.user.create({
      data: {
        email,
        role: UserRole.ADMIN,
        admin: { create: { name } },
      },
    });

    await this.messageQueueService.enqueueSetPasswordEmail({
      isActivateAccount: true,
      tokenPayload: {
        email: user.email,
        role: UserRole.ADMIN,
        sub: user.id,
      },
    });
  }

  async getAdmins(): Promise<AdminProfileRes[]> {
    const admins = await this.prisma.admin.findMany({
      select: {
        id: true,
        name: true,
        phone: true,
        user: { select: { email: true, password: true } },
      },
    });

    return admins.map((admin) => ({
      id: admin.id,
      name: admin.name,
      phone: admin.phone,
      email: admin.user.email,
      isActivated: !!admin.user.password,
    }));
  }

  async getProfile(adminId: string): Promise<AdminProfileRes> {
    const admin = await this.prisma.admin.findUniqueOrThrow({
      where: { id: adminId },
      select: {
        id: true,
        name: true,
        phone: true,
        user: { select: { email: true, password: true } },
      },
    });

    return {
      id: admin.id,
      name: admin.name,
      phone: admin.phone,
      email: admin.user.email,
      isActivated: !!admin.user.password,
    };
  }

  async updateProfile(adminId: string, body: UpdateAdminBody) {
    await this.prisma.admin.update({
      data: { name: body.name, phone: body.phone },
      where: { id: adminId },
    });
  }

  async updateLecturerDesignation(
  lecturerId: string,
  body: UpdateLecturerDesignationDto,
): Promise<void> {
  // Guard: PART_ADVISER must have a level
  if (body.role === LecturerRole.PART_ADVISER && !body.part) {
    throw new BadRequestException(
      'part (Level) is required when assigning the PART_ADVISER role',
    );
  }
 
  const lecturer = await this.prisma.lecturer.findUnique({
    where: { id: lecturerId },
    select: { id: true, departmentId: true },
  });
 
  if (!lecturer) {
    throw new NotFoundException(`Lecturer ${lecturerId} not found`);
  }
 
  await this.prisma.$transaction(async (tx) => {
    if (body.role !== LecturerRole.COURSE_LECTURER) {
      // Remove any existing non-COURSE_LECTURER designation before assigning new role
      await tx.lecturerDesignation.deleteMany({
        where: {
          lecturerId: lecturer.id,
          role: { not: LecturerRole.COURSE_LECTURER },
        },
      });
    }
 
    // Upsert the new designation — safe for both COURSE_LECTURER and other roles
    await tx.lecturerDesignation.upsert({
      where: {
        designation: {
          entity:     lecturer.departmentId,
          role:       body.role,
          lecturerId: lecturer.id,
          part:       body.part,
        } as any,
      },
      update: {},
      create: {
        entity:     lecturer.departmentId,
        role:       body.role,
        lecturerId: lecturer.id,
        ...(body.part ? { part: body.part } : {}),
      },
    });
  });
  }

  async activateFixtureLecturers({ emails, password }: ActivateFixtureLecturersBody) {
    const uniqueEmails = [...new Set(emails.map((email) => email.trim().toLowerCase()))];

    if (!uniqueEmails.length) {
      throw new BadRequestException('emails must contain at least one lecturer email');
    }

    const users = await this.prisma.user.findMany({
      where: {
        role: UserRole.LECTURER,
        email: { in: uniqueEmails },
      },
      select: { id: true, email: true, password: true },
    });

    const foundByEmail = new Set(users.map((user) => user.email.toLowerCase()));
    const notFoundEmails = uniqueEmails.filter((email) => !foundByEmail.has(email));

    const hash = await argon2.hash(password);
    let activatedCount = 0;
    let skippedCount = 0;

    await this.prisma.$transaction(async (tx) => {
      for (const user of users) {
        if (user.password) {
          skippedCount += 1;
          continue;
        }

        await tx.user.update({
          where: { id: user.id },
          data: { password: hash },
        });

        activatedCount += 1;
      }
    });

    return {
      activatedCount,
      skippedCount,
      notFoundEmails,
    };
  }
}
