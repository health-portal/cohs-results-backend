import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import type { AuthService } from './auth.service';
import {
  SetPasswordBody,
  RequestPasswordResetBody,
  SigninUserBody,
  SetPasswordRes,
  SigninUserRes,
} from './auth.schema';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('activate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Activate a user account' })
  @ApiBody({ type: SetPasswordBody })
  @ApiOkResponse({ type: SetPasswordRes })
  @ApiConflictResponse({ description: 'User already activated' })
  @ApiBadRequestResponse({ description: 'Non-existent or invalid token' })
  async activateUser(@Body() body: SetPasswordBody) {
    return await this.authService.activateUser(body);
  }

  @Post('signin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Signin a user account' })
  @ApiBody({ type: SigninUserBody })
  @ApiOkResponse({ type: SigninUserRes })
  @ApiUnauthorizedResponse({ description: 'Invalid credentials' })
  @ApiForbiddenResponse({ description: 'User not activated' })
  async signinUser(@Body() body: SigninUserBody) {
    return await this.authService.signinUser(body);
  }

  @Post('reset-password/request')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request a password reset' })
  @ApiBody({ type: RequestPasswordResetBody })
  @ApiOkResponse({ description: 'Password reset request sent' })
  @ApiUnauthorizedResponse({ description: 'User not found' })
  async requestPasswordReset(@Body() body: RequestPasswordResetBody) {
    return await this.authService.requestPasswordReset(body);
  }

  @Post('reset-password/confirm')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password' })
  @ApiBody({ type: SetPasswordBody })
  @ApiOkResponse({ type: SetPasswordRes })
  @ApiUnauthorizedResponse({ description: 'User not found' })
  @ApiBadRequestResponse({ description: 'Non-existent or invalid token' })
  async confirmPasswordReset(@Body() body: SetPasswordBody) {
    return await this.authService.confirmPasswordReset(body);
  }
}
