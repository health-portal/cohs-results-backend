import { Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
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
import { FileRes, ProvideAltHeaderMappingsBody } from './files.schema';

@ApiTags('files', 'Admin', 'Lecturer')
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

  @ApiOperation({ summary: 'Provide alternative header mappings' })
  @ApiOkResponse({
    description: 'Alternative header mappings provided successfully',
  })
  @Put(':fileId/alt-header-mappings')
  async provideAltHeaderMappings(
    @User() user: UserPayload,
    @Param('fileId') fileId: string,
    @Body() body: ProvideAltHeaderMappingsBody,
  ) {
    return await this.filesService.provideAltHeaderMappings(
      user.sub,
      fileId,
      body,
    );
  }
}
