import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { AddAdminBody, UpdateAdminBody } from './admin.dto';
import { UserRole } from '@prisma/client';
import { MessageQueueService } from 'src/message-queue/message-queue.service';
import { AdminProfileRes } from './admin.responses';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly messageQueueService: MessageQueueService,
  ) {}

  async addAdmin({ email, name }: AddAdminBody) {
    const createdUser = await this.prisma.user.create({
      data: {
        email,
        role: UserRole.ADMIN,
        admin: { create: { name } },
      },
    });

    await this.messageQueueService.enqueueSetPasswordEmail({
      isActivateAccount: true,
      tokenPayload: {
        email: createdUser.email,
        role: UserRole.ADMIN,
        sub: createdUser.id,
      },
    });
  }

  async getAdmins(): Promise<AdminProfileRes[]> {
    const foundAdmins = await this.prisma.admin.findMany({
      select: {
        id: true,
        name: true,
        phone: true,
        user: { select: { email: true, password: true } },
      },
    });

    return foundAdmins.map((admin) => ({
      id: admin.id,
      name: admin.name,
      phone: admin.phone,
      email: admin.user.email,
      isActivated: !!admin.user.password,
    }));
  }

  async getProfile(adminId: string): Promise<AdminProfileRes> {
    const foundAdmin = await this.prisma.admin.findUniqueOrThrow({
      where: { id: adminId },
      select: {
        id: true,
        name: true,
        phone: true,
        user: { select: { email: true, password: true } },
      },
    });

    return {
      id: foundAdmin.id,
      name: foundAdmin.name,
      phone: foundAdmin.phone,
      email: foundAdmin.user.email,
      isActivated: !!foundAdmin.user.password,
    };
  }

  async updateProfile(adminId: string, body: UpdateAdminBody) {
    await this.prisma.admin.update({
      data: { name: body.name, phone: body.phone },
      where: { id: adminId },
      select: {
        id: true,
        name: true,
        phone: true,
        user: { select: { email: true } },
      },
    });
  }
}
