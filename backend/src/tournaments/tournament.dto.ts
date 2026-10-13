import { OmitType, PartialType } from '@nestjs/mapped-types';
import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { tournamentStatus, type TournamentStatus } from '../db/schema';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class CreateTournamentDto {
  @Transform(trim)
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  name!: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(1000)
  description?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(180)
  timeControlMinutes!: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(60)
  incrementSeconds: number = 0;

  /** ISO 8601 with an offset or Z, e.g. 2026-10-20T16:30:00+05:30. Stored as UTC. */
  @IsISO8601({ strict: true }, { message: 'startsAt must be an ISO 8601 date-time' })
  startsAt!: string;

  @IsOptional()
  @IsIn(['draft', 'open'], { message: 'A new tournament starts as draft or open' })
  status?: 'draft' | 'open';
}

/** Status has its own endpoint because transitions have rules. */
export class UpdateTournamentDto extends PartialType(OmitType(CreateTournamentDto, ['status'] as const)) {}

export class UpdateStatusDto {
  @IsIn(tournamentStatus.enumValues)
  status!: TournamentStatus;
}

export class ListTournamentsQuery {
  /** Comma-separated statuses, e.g. `open,ongoing`. */
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.split(',').filter(Boolean) : value))
  @IsArray()
  @IsIn(tournamentStatus.enumValues, { each: true })
  status?: TournamentStatus[];
}

export class AddParticipantDto {
  @IsUUID()
  userId!: string;
}
