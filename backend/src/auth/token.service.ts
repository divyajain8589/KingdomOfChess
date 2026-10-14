import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { parseCookie } from 'cookie';
import { eq } from 'drizzle-orm';
import { AuthUser } from '../common/auth.decorators';
import { Database } from '../db/db';
import { InjectDb } from '../db/db.module';
import { users, type Role } from '../db/schema';
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
  /** The account's tokenVersion at signing; a password change bumps it and retires older tokens. */
  ver: number;
}

/** Signs/verifies the session JWT. Shared by the HTTP guard and the Socket.IO handshake. */
@Injectable()
export class TokenService {
  constructor(
    private readonly jwt: JwtService,
    @InjectDb() private readonly db: Database,
  ) {}

  async sign(user: AuthUser, kind: TokenKind = 'session'): Promise<string> {
    const [u] = await this.db.select({ ver: users.tokenVersion }).from(users).where(eq(users.id, user.id)).limit(1);
    const payload: JwtPayload = { sub: user.id, email: user.email, name: user.name, role: user.role, kind, ver: u?.ver ?? 0 };
    return this.jwt.signAsync(payload, kind === 'socket' ? { expiresIn: SOCKET_TOKEN_SECONDS } : {});
  }

  async verify(token: string | undefined, kind: TokenKind = 'session'): Promise<AuthUser | null> {
    if (!token) return null;
    try {
      const p = await this.jwt.verifyAsync<JwtPayload>(token);
      if (p.kind !== kind) return null;
      // The account must still exist, and the token must come from its current password.
      const [u] = await this.db
        .select({ id: users.id, email: users.email, name: users.name, role: users.role, ver: users.tokenVersion })
        .from(users)
        .where(eq(users.id, p.sub))
        .limit(1);
      if (!u || (p.ver ?? 0) !== u.ver) return null;
      return { id: u.id, email: u.email, name: u.name, role: u.role };
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
