import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';
import type { Role } from '../db/schema';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: Role;
}

export const IS_PUBLIC = 'isPublic';
export const ROLES = 'roles';

/** Skip the global JWT guard (login, health). */
export const Public = () => SetMetadata(IS_PUBLIC, true);

/** Restrict a route/controller to the given roles. */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES, roles);

export const CurrentUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): AuthUser => ctx.switchToHttp().getRequest().user,
);
