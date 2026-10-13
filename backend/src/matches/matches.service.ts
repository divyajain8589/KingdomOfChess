import { Injectable } from '@nestjs/common';
import { and, asc, desc, eq, inArray, or } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { Database } from '../db/db';
import { InjectDb } from '../db/db.module';
import { matches, tournamentParticipants, tournaments, users } from '../db/schema';
import { GameService } from '../game/game.service';
import { pairKey } from '../tournaments/tournament-rules';
import { TournamentsService } from '../tournaments/tournaments.service';

const whiteUser = alias(users, 'white_user');
const blackUser = alias(users, 'black_user');

@Injectable()
export class MatchesService {
  constructor(
    @InjectDb() private readonly db: Database,
    private readonly games: GameService,
    private readonly tournaments: TournamentsService,
  ) {}

  /** A student's games, newest first, optionally in one tournament. */
  history(userId: string, tournamentId?: string) {
    const mine = or(eq(matches.whiteId, userId), eq(matches.blackId, userId));
    return this.db
      .select({
        id: matches.id,
        tournament: { id: tournaments.id, name: tournaments.name },
        status: matches.status,
        result: matches.result,
        termination: matches.termination,
        startedAt: matches.startedAt,
        endedAt: matches.endedAt,
        white: { id: whiteUser.id, name: whiteUser.name },
        black: { id: blackUser.id, name: blackUser.name },
      })
      .from(matches)
      .innerJoin(tournaments, eq(tournaments.id, matches.tournamentId))
      .innerJoin(whiteUser, eq(whiteUser.id, matches.whiteId))
      .innerJoin(blackUser, eq(blackUser.id, matches.blackId))
      .where(tournamentId ? and(mine, eq(matches.tournamentId, tournamentId)) : mine)
      .orderBy(desc(matches.startedAt));
  }

  /**
   * "What's next for me": every tournament I'm in that hasn't finished, when it starts, my current
   * rank, and — since pairing is round-robin — who I still have to play.
   */
  async schedule(userId: string) {
    const joined = await this.db
      .select({ t: tournaments })
      .from(tournamentParticipants)
      .innerJoin(tournaments, eq(tournaments.id, tournamentParticipants.tournamentId))
      .where(and(eq(tournamentParticipants.userId, userId), inArray(tournaments.status, ['open', 'ongoing'])))
      .orderBy(asc(tournaments.startsAt));

    const activeMatchId = await this.games.activeMatchId(userId);

    const items = await Promise.all(
      joined.map(async ({ t }) => {
        const [standings, played] = await Promise.all([
          this.tournaments.standings(t.id),
          this.db
            .select({ whiteId: matches.whiteId, blackId: matches.blackId })
            .from(matches)
            .where(and(eq(matches.tournamentId, t.id), or(eq(matches.whiteId, userId), eq(matches.blackId, userId)))),
        ]);
        const met = new Set(played.map((m) => pairKey(m.whiteId, m.blackId)));
        const me = standings.find((s) => s.userId === userId);
        return {
          tournament: {
            id: t.id,
            name: t.name,
            status: t.status,
            startsAt: t.startsAt,
            timeControl: `${t.timeControlMinutes}+${t.incrementSeconds}`,
          },
          rank: me?.rank ?? null,
          points: me?.points ?? 0,
          players: standings.length,
          gamesPlayed: me?.played ?? 0,
          remainingOpponents: standings
            .filter((s) => s.userId !== userId && !met.has(pairKey(userId, s.userId)))
            .map((s) => ({ id: s.userId, name: s.name })),
        };
      }),
    );

    return { activeMatchId, tournaments: items };
  }
}
