import { CanActivate, ExecutionContext, HttpStatus, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { AppException, forbidden } from '../common/app-exception';
import { IS_PUBLIC, ROLES } from '../common/auth.decorators';
import type { Role } from '../db/schema';
import { AUTH_COOKIE } from './auth.constants';
import { TokenService } from './token.service';

/** Global guard: every route needs a valid session cookie unless marked @Public(). */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly tokens: TokenService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [ctx.getHandler(), ctx.getClass()]);
    if (isPublic) return true;
    const req = ctx.switchToHttp().getRequest<Request & { user?: unknown }>();
    const user = await this.tokens.verify(req.cookies?.[AUTH_COOKIE]);
    if (!user) throw new AppException(HttpStatus.UNAUTHORIZED, 'UNAUTHORIZED', 'Please sign in');
    req.user = user;
    return true;
  }
}

/** Global guard (runs after JwtAuthGuard): enforces @Roles(...). */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<Role[] | undefined>(ROLES, [ctx.getHandler(), ctx.getClass()]);
    if (!roles?.length) return true;
    const user = ctx.switchToHttp().getRequest().user as { role: Role } | undefined;
    if (!user || !roles.includes(user.role)) {
      throw forbidden(`This action is only available to ${roles.join(' / ')} accounts`);
    }
    return true;
  }
}
