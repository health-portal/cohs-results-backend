import { ApiProperty, PickType } from '@nestjs/swagger';
import { AdminResponse } from 'src/prisma/prisma.responses';

export class AdminProfileRes extends PickType(AdminResponse, [
  'id',
  'name',
  'phone',
] as const) {
  @ApiProperty({ readOnly: true })
  isActivated: boolean;

  @ApiProperty({ readOnly: true })
  email: string;
}
