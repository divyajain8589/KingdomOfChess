import { Body, Controller, Get, HttpCode, HttpStatus, Post, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { CookieOptions, Response } from 'express';
import { AuthUser, CurrentUser, Public } from '../common/auth.decorators';
import { AUTH_COOKIE } from './auth.constants';
import { AuthService } from './auth.service';
import { LoginDto } from './login.dto';
import { TokenService } from './token.service';

@Controller()
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly tokens: TokenService,
    private readonly config: ConfigService,
  ) {}

  private cookieOptions(): CookieOptions {
    return {
      httpOnly: true,
      sameSite: 'lax',
      secure: this.config.get('COOKIE_SECURE') === 'true',
      path: '/',
    };
  }

  @Public()
  @Post('auth/login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response): Promise<AuthUser> {
    const user = await this.auth.validate(dto.email, dto.password);
    const maxAge = Number(this.config.get('JWT_EXPIRES_IN_SECONDS') ?? 86400) * 1000;
    res.cookie(AUTH_COOKIE, await this.tokens.sign(user), { ...this.cookieOptions(), maxAge });
    return user;
  }

  @Public()
  @Post('auth/logout')
  @HttpCode(HttpStatus.OK)
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie(AUTH_COOKIE, this.cookieOptions());
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
