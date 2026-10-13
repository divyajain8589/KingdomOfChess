import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { parseCookie } from 'cookie';
import { AuthUser } from '../common/auth.decorators';
import type { Role } from '../db/schema';
import { AUTH_COOKIE } from './auth.constants';

interface JwtPayload {
  sub: string;
  email: string;
  name: string;
  role: Role;
}

/** Signs/verifies the session JWT. Shared by the HTTP guard and the Socket.IO handshake. */
@Injectable()
export class TokenService {
  constructor(private readonly jwt: JwtService) {}

  sign(user: AuthUser): Promise<string> {
    const payload: JwtPayload = { sub: user.id, email: user.email, name: user.name, role: user.role };
    return this.jwt.signAsync(payload);
  }

  async verify(token: string | undefined): Promise<AuthUser | null> {
    if (!token) return null;
    try {
      const p = await this.jwt.verifyAsync<JwtPayload>(token);
      return { id: p.sub, email: p.email, name: p.name, role: p.role };
    } catch {
      return null;
    }
  }

  /** Read the auth cookie out of a raw `Cookie` header (used for the websocket handshake). */
  fromCookieHeader(header: string | undefined): string | undefined {
    if (!header) return undefined;
    return parseCookie(header)[AUTH_COOKIE];
  }
}
