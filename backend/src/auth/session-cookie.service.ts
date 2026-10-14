import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { CookieOptions, Response } from 'express';
import { AuthUser } from '../common/auth.decorators';
import { AUTH_COOKIE } from './auth.constants';
import { TokenService } from './token.service';

/** Sets and clears the httpOnly session cookie. */
@Injectable()
export class SessionCookieService {
  constructor(
    private readonly tokens: TokenService,
    private readonly config: ConfigService,
  ) {}

  private options(): CookieOptions {
    return {
      httpOnly: true,
      sameSite: 'lax',
      secure: this.config.get('COOKIE_SECURE') === 'true',
      path: '/',
    };
  }

  async issue(res: Response, user: AuthUser) {
    const maxAge = Number(this.config.get('JWT_EXPIRES_IN_SECONDS') ?? 86400) * 1000;
    res.cookie(AUTH_COOKIE, await this.tokens.sign(user), { ...this.options(), maxAge });
  }

  clear(res: Response) {
    res.clearCookie(AUTH_COOKIE, this.options());
  }
}
