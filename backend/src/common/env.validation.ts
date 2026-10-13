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
}

/** Fail fast at boot if the environment is incomplete. */
export function validateEnv(raw: Record<string, unknown>) {
  const env = plainToInstance(EnvVars, raw, { enableImplicitConversion: false });
  const errors = validateSync(env, { skipMissingProperties: false });
  if (errors.length) {
    throw new Error(`Invalid environment:\n${errors.map((e) => ` - ${Object.values(e.constraints ?? {}).join(', ')}`).join('\n')}`);
  }
  return env;
}
