import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { IsOptional, IsUUID } from 'class-validator';
import { AuthUser, CurrentUser, Roles } from '../common/auth.decorators';
import { GameService } from '../game/game.service';
import { MatchesService } from './matches.service';

class HistoryQuery {
  @IsOptional()
  @IsUUID()
  tournamentId?: string;
}

@Controller()
export class MatchesController {
  constructor(
    private readonly matches: MatchesService,
    private readonly games: GameService,
  ) {}

  /** Full board/clock/PGN state. Players: own games only. Coaches: any game. */
  @Get('matches/:id')
  get(@CurrentUser() user: AuthUser, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.games.getState(user, id);
  }

  @Roles('student')
  @Get('me/matches')
  history(@CurrentUser() user: AuthUser, @Query() q: HistoryQuery) {
    return this.matches.history(user.id, q.tournamentId);
  }

  @Roles('student')
  @Get('me/active-match')
  async active(@CurrentUser() user: AuthUser) {
    return { matchId: await this.games.activeMatchId(user.id) };
  }

  @Roles('student')
  @Get('me/schedule')
  schedule(@CurrentUser() user: AuthUser) {
    return this.matches.schedule(user.id);
  }
}
