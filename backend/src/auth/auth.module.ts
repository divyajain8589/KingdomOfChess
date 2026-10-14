import { ExecutionContext, Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AuthController } from './auth.controller';
import { JwtAuthGuard, RolesGuard } from './auth.guard';
import { AuthService } from './auth.service';
import { SessionCookieService } from './session-cookie.service';
import { TokenService } from './token.service';

const FIFTEEN_MINUTES = 15 * 60_000;

const isLogin = (ctx: ExecutionContext) => ctx.getHandler() === AuthController.prototype.login;
const loginEmail = (req: Record<string, any>) =>
  typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';

@Global()
@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
        signOptions: { algorithm: 'HS256', expiresIn: Number(config.get('JWT_EXPIRES_IN_SECONDS') ?? 86400) },
        verifyOptions: { algorithms: ['HS256'] },
      }),
    }),
    // HTTP only: socket events are limited in GameGateway. Counters are per route.
    ThrottlerModule.forRoot({
      skipIf: (ctx) => ctx.getType() !== 'http',
      errorMessage: 'Too many requests. Please wait a few minutes and try again.',
      throttlers: [
        // Signed-in users are counted per account (a classroom shares one IP), everyone else per IP.
        {
          name: 'default',
          ttl: 60_000,
          limit: 120,
          getTracker: (req) => (req.user?.id ? `user:${req.user.id}` : `ip:${req.ip}`),
        },
        // Password guessing: per target account, and per IP across accounts.
        {
          name: 'login-account',
          ttl: FIFTEEN_MINUTES,
          limit: 10,
          skipIf: (ctx) => !isLogin(ctx),
          getTracker: (req) => `email:${loginEmail(req)}`,
        },
        {
          name: 'login-ip',
          ttl: FIFTEEN_MINUTES,
          limit: 60,
          skipIf: (ctx) => !isLogin(ctx),
          getTracker: (req) => `ip:${req.ip}`,
        },
      ],
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    TokenService,
    SessionCookieService,
    // Order matters: authenticate first, then check roles, then count (so users are keyed by account).
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
  exports: [TokenService, SessionCookieService],
})
export class AuthModule {}
