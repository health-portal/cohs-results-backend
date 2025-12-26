import { Controller, Get, UseGuards } from '@nestjs/common';
import { FilesService } from './files.service';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { AuthRoles, UserRoleGuard } from 'src/auth/role.guard';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { User } from 'src/auth/user.decorator';
import { type UserPayload } from 'src/auth/auth.schema';
import { FileRes } from './files.schema';

@ApiTags('Files')
@ApiBearerAuth('accessToken')
@Controller('files')
@AuthRoles([UserRole.ADMIN, UserRole.LECTURER])
@UseGuards(JwtAuthGuard, UserRoleGuard)
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @ApiOperation({ summary: 'Get all files' })
  @ApiOkResponse({ type: [FileRes] })
  @Get()
  async getFiles(@User() user: UserPayload) {
    return await this.filesService.getFiles(user.sub);
  }
}
