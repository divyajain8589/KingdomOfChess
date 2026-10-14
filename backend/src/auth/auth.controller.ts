import { Body, Controller, Get, HttpCode, HttpStatus, Post, Res } from '@nestjs/common';
import type { Response } from 'express';
import { AuthUser, CurrentUser, Public } from '../common/auth.decorators';
import { AuthService } from './auth.service';
import { LoginDto } from './login.dto';
import { SessionCookieService } from './session-cookie.service';
import { TokenService } from './token.service';

@Controller()
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly tokens: TokenService,
    private readonly cookies: SessionCookieService,
  ) {}

  @Public()
  @Post('auth/login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response): Promise<AuthUser> {
    const user = await this.auth.validate(dto.email, dto.password);
    await this.cookies.issue(res, user);
    return user;
  }

  @Public()
  @Post('auth/logout')
  @HttpCode(HttpStatus.OK)
  logout(@Res({ passthrough: true }) res: Response) {
    this.cookies.clear(res);
    return { loggedOut: true };
  }

  /** Short-lived token for the Socket.IO handshake (see TokenService). */
  @Get('auth/socket-token')
  async socketToken(@CurrentUser() user: AuthUser) {
    return { token: await this.tokens.sign(user, 'socket') };
  }

  @Get('me')
  me(@CurrentUser() user: AuthUser): Promise<AuthUser> {
    return this.auth.me(user.id);
  }
}
