import { plainToInstance, Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, IsUrl, Min, MinLength, validateSync } from 'class-validator';

class EnvVars {
  @IsString()
  DATABASE_URL!: string;

  @IsString()
  @MinLength(16)
  JWT_SECRET!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(60)
  JWT_EXPIRES_IN_SECONDS: number = 86400;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  PORT: number = 4000;

  @IsUrl({ require_tld: false })
  FRONTEND_URL!: string;

  @IsOptional()
  @IsIn(['true', 'false'])
  COOKIE_SECURE: string = 'false';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  TRUST_PROXY: number = 0;
}

// Placeholder secrets from .env.example and docker-compose.yml; anyone can forge sessions with these.
const KNOWN_SECRETS = [
  'change-me-to-a-long-random-string',
  'dev-only-insecure-jwt-secret-change-me-in-production-0123456789',
];

/** Fail fast at boot if the environment is incomplete. */
export function validateEnv(raw: Record<string, unknown>) {
  const env = plainToInstance(EnvVars, raw, { enableImplicitConversion: false });
  const errors = validateSync(env, { skipMissingProperties: false });
  if (errors.length) {
    throw new Error(`Invalid environment:\n${errors.map((e) => ` - ${Object.values(e.constraints ?? {}).join(', ')}`).join('\n')}`);
  }
  if (KNOWN_SECRETS.includes(env.JWT_SECRET)) {
    if (raw.NODE_ENV === 'production' && raw.ALLOW_INSECURE_DEV_SECRET !== 'true') {
      throw new Error('Invalid environment:\n - JWT_SECRET is a published placeholder; set a long random secret');
    }
    console.warn('WARNING: JWT_SECRET is a published placeholder. Fine for local development only.');
  }
  if (raw.NODE_ENV === 'production' && env.COOKIE_SECURE !== 'true') {
    console.warn('WARNING: COOKIE_SECURE is not "true"; the session cookie will also be sent over plain HTTP.');
  }
  return env;
}
