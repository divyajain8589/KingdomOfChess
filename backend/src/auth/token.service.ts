import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { parseCookie } from 'cookie';
import { AuthUser } from '../common/auth.decorators';
import type { Role } from '../db/schema';
import { AUTH_COOKIE } from './auth.constants';

/**
 * `session`: the httpOnly cookie. `socket`: a 60-second token the web app fetches (through the cookie)
 * to open the Socket.IO connection when the API is on another site and the cookie can't ride along.
 * Each is only accepted where it belongs.
 */
export type TokenKind = 'session' | 'socket';

const SOCKET_TOKEN_SECONDS = 60;

interface JwtPayload {
  sub: string;
  email: string;
  name: string;
  role: Role;
  kind: TokenKind;
}

/** Signs/verifies the session JWT. Shared by the HTTP guard and the Socket.IO handshake. */
@Injectable()
export class TokenService {
  constructor(private readonly jwt: JwtService) {}

  sign(user: AuthUser, kind: TokenKind = 'session'): Promise<string> {
    const payload: JwtPayload = { sub: user.id, email: user.email, name: user.name, role: user.role, kind };
    return this.jwt.signAsync(payload, kind === 'socket' ? { expiresIn: SOCKET_TOKEN_SECONDS } : {});
  }

  async verify(token: string | undefined, kind: TokenKind = 'session'): Promise<AuthUser | null> {
    if (!token) return null;
    try {
      const p = await this.jwt.verifyAsync<JwtPayload>(token);
      if (p.kind !== kind) return null;
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
