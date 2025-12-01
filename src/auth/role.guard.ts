import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { UserPayload } from './auth.schema';
import { UserRole } from '@prisma/client';

export const AuthRoles = Reflector.createDecorator<UserRole[]>();

@Injectable()
export class UserRoleGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles: UserRole[] = this.reflector.get(
      AuthRoles,
      context.getHandler(),
    );
    if (!roles) return true;

    const request: Request = context.switchToHttp().getRequest();
    const user = request.user as UserPayload;

    return roles.includes(user.userRole);
  }
}
