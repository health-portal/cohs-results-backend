import {
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  SetPasswordBody,
  RequestPasswordResetBody,
  SigninUserBody,
  UserData,
} from './auth.schema';
import * as argon2 from 'argon2';
import { isEmail } from 'class-validator';
import { UserRole } from '@prisma/client';
import { MessageQueueService } from 'src/message-queue/message-queue.service';
import { TokensService } from 'src/tokens/tokens.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly messageQueueService: MessageQueueService,
    private readonly tokensService: TokensService,
  ) {}

  private async findUserByEmail(email: string, role: UserRole) {
    return await this.prisma.user.findUniqueOrThrow({
      where: { email, role },
    });
  }

  private async findUserByMatric(matricNumber: string) {
    const { user: foundUser } = await this.prisma.student.findUniqueOrThrow({
      where: { matricNumber },
      select: { user: true },
    });

    return foundUser;
  }

  private async findUser(identifier: string, role: UserRole) {
    if (role !== UserRole.STUDENT)
      return await this.findUserByEmail(identifier, role);
    else {
      const foundUser = isEmail(identifier)
        ? await this.findUserByEmail(identifier, role)
        : await this.findUserByMatric(identifier);

      return foundUser;
    }
  }

  private async getUserData(userId: string) {
    const foundUser = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        id: true,
        role: true,
        email: true,
        admin: {
          select: { id: true },
        },
        lecturer: {
          select: {
            id: true,
            departmentId: true,
            designations: true,
            department: {
              select: { facultyId: true },
            },
          },
        },
        student: {
          select: {
            id: true,
            departmentId: true,
            matricNumber: true,
            level: true,
            department: {
              select: { facultyId: true },
            },
          },
        },
      },
    });

    switch (foundUser.role) {
      case UserRole.ADMIN:
        return { adminId: foundUser.admin!.id };

      case UserRole.LECTURER:
        return {
          lecturerId: foundUser.lecturer!.id,
          departmentId: foundUser.lecturer!.departmentId,
          facultyId: foundUser.lecturer!.department.facultyId,
          designations: foundUser.lecturer!.designations.map((designation) => ({
            entity: designation.entity,
            role: designation.role,
          })),
        };

      case UserRole.STUDENT:
        return {
          studentId: foundUser.student!.id,
          level: foundUser.student!.level,
          facultyId: foundUser.student!.department.facultyId,
          matricNumber: foundUser.student!.matricNumber,
          departmentId: foundUser.student!.departmentId,
        };

      default:
        throw new UnprocessableEntityException(`User role does not exist`);
    }
  }

  async activateUser({ tokenString, password }: SetPasswordBody) {
    const { email, role } = await this.tokensService.verifyToken(tokenString);
    const foundUser = await this.findUser(email, role);
    const userId = foundUser.id;

    if (foundUser.password)
      throw new ConflictException('User already activated');

    const hashedPassword = await argon2.hash(password);
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
      select: { id: true, email: true, role: true },
    });

    return updatedUser;
  }

  async signinUser({ identifier, password, role }: SigninUserBody) {
    const foundUser = await this.findUser(identifier, role);
    if (!foundUser.password) throw new ForbiddenException('User not activated');

    const isPasswordValid = await argon2.verify(foundUser.password, password);
    if (!isPasswordValid)
      throw new UnauthorizedException('Invalid credentials');

    const userData: UserData = await this.getUserData(foundUser.id);

    const accessToken = await this.tokensService.generateAccessToken({
      sub: foundUser.id,
      email: foundUser.email,
      userRole: foundUser.role,
      userData,
    });

    return { accessToken };
  }

  async requestPasswordReset({ identifier, role }: RequestPasswordResetBody) {
    const foundUser = await this.findUser(identifier, role);

    const job = await this.messageQueueService.enqueueEmail({
      isActivateAccount: true,
      tokenPayload: {
        email: foundUser.email,
        role: foundUser.role,
        sub: foundUser.id,
      },
    });

    return { job };
  }

  async confirmPasswordReset({ password, tokenString }: SetPasswordBody) {
    const { email, role } = await this.tokensService.verifyToken(tokenString);
    const foundUser = await this.findUser(email, role);

    const hashedPassword = await argon2.hash(password);
    const updatedUser = await this.prisma.user.update({
      where: { id: foundUser.id },
      data: { password: hashedPassword },
      select: { id: true, email: true, role: true },
    });

    return updatedUser;
  }
}
