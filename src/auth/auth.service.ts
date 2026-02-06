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
} from './auth.dto';
import * as argon2 from 'argon2';
import { isEmail } from 'class-validator';
import { UserRole } from '@prisma/client';
import { MessageQueueService } from 'src/message-queue/message-queue.service';
import { TokensService } from 'src/tokens/tokens.service';
import { SigninUserRes, UserRes } from './auth.responses';

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
      const user = isEmail(identifier)
        ? await this.findUserByEmail(identifier, role)
        : await this.findUserByMatric(identifier);

      return user;
    }
  }

  private async getUserData(userId: string): Promise<UserData> {
    const user = await this.prisma.user.findUniqueOrThrow({
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

    switch (user.role) {
      case UserRole.ADMIN:
        return { adminId: user.admin!.id };

      case UserRole.LECTURER:
        return {
          lecturerId: user.lecturer!.id,
          departmentId: user.lecturer!.departmentId,
          facultyId: user.lecturer!.department.facultyId,
          designations: user.lecturer!.designations.map((designation) => ({
            entity: designation.entity,
            role: designation.role,
          })),
        };

      case UserRole.STUDENT:
        return {
          studentId: user.student!.id,
          level: user.student!.level,
          facultyId: user.student!.department.facultyId,
          matricNumber: user.student!.matricNumber,
          departmentId: user.student!.departmentId,
        };

      default:
        throw new UnprocessableEntityException(`User role does not exist`);
    }
  }

  async activateUser({
    tokenString,
    password,
  }: SetPasswordBody): Promise<UserRes> {
    const { email, role } = await this.tokensService.verifyToken(tokenString);
    const user = await this.findUser(email, role);
    const userId = user.id;

    if (user.password) throw new ConflictException('User already activated');

    const hashedPassword = await argon2.hash(password);
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
      select: { id: true, email: true, role: true },
    });

    return updatedUser;
  }

  async signinUser({
    identifier,
    password,
    role,
  }: SigninUserBody): Promise<SigninUserRes> {
    const user = await this.findUser(identifier, role);
    if (!user.password) throw new ForbiddenException('User not activated');

    const isPasswordValid = await argon2.verify(user.password, password);
    if (!isPasswordValid)
      throw new UnauthorizedException('Invalid credentials');

    const userData: UserData = await this.getUserData(user.id);

    const accessToken = await this.tokensService.generateAccessToken({
      sub: user.id,
      email: user.email,
      userRole: user.role,
      userData,
    });

    return { accessToken };
  }

  async requestPasswordReset({ identifier, role }: RequestPasswordResetBody) {
    const user = await this.findUser(identifier, role);

    await this.messageQueueService.enqueueSetPasswordEmail({
      isActivateAccount: false,
      tokenPayload: {
        email: user.email,
        role: user.role,
        sub: user.id,
      },
    });
  }

  async confirmPasswordReset({
    password,
    tokenString,
  }: SetPasswordBody): Promise<UserRes> {
    const { email, role } = await this.tokensService.verifyToken(tokenString);
    const user = await this.findUser(email, role);

    const hashedPassword = await argon2.hash(password);
    const updatedUser = await this.prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
      select: { id: true, email: true, role: true },
    });

    return updatedUser;
  }
}
