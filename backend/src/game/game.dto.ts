import { plainToInstance } from 'class-transformer';
import { IsBoolean, IsIn, IsOptional, IsUUID, Matches, validateSync } from 'class-validator';
import { HttpStatus } from '@nestjs/common';
import { AppException } from '../common/app-exception';

const SQUARE = /^[a-h][1-8]$/;

export class TournamentRefDto {
  @IsUUID()
  tournamentId!: string;
}

export class MatchRefDto {
  @IsUUID()
  matchId!: string;
}

export class MoveDto extends MatchRefDto {
  @Matches(SQUARE)
  from!: string;

  @Matches(SQUARE)
  to!: string;

  @IsOptional()
  @IsIn(['q', 'r', 'b', 'n'])
  promotion?: 'q' | 'r' | 'b' | 'n';
}

export class DrawResponseDto extends MatchRefDto {
  @IsBoolean()
  accept!: boolean;
}

/** class-validator for socket payloads (Nest's ValidationPipe is HTTP-shaped). */
export function parsePayload<T extends object>(cls: new () => T, payload: unknown): T {
  const obj = plainToInstance(cls, payload ?? {});
  const errors = validateSync(obj, { whitelist: true, forbidNonWhitelisted: true });
  if (errors.length) {
    const msg = errors.flatMap((e) => Object.values(e.constraints ?? {})).join('; ');
    throw new AppException(HttpStatus.BAD_REQUEST, 'VALIDATION_ERROR', msg);
  }
  return obj;
}
