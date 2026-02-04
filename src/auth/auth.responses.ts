import { ApiProperty, PickType } from '@nestjs/swagger';
import { UserResponse } from 'src/prisma/prisma.responses';

export class UserRes extends PickType(UserResponse, [
  'id',
  'email',
  'role',
] as const) {}

export class SigninUserRes {
  @ApiProperty()
  accessToken: string;
}
