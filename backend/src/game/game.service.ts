import { HttpStatus, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Chess } from 'chess.js';
import { and, eq, SQL } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { AppException, conflict, forbidden, notFound } from '../common/app-exception';
import { AuthUser } from '../common/auth.decorators';
import { DomainEvents } from '../common/domain-events';
import { Database } from '../db/db';
import { InjectDb } from '../db/db.module';
import { activePlayers, matches, tournaments, users, type Match, type MatchResult, type MatchTermination } from '../db/schema';
import {
  ClockState,
  clockAt,
  Color,
  detectGameEnd,
  gameHeaders,
  GameOutcome,
  MoveError,
  MoveInput,
  msUntilFlag,
  opposite,
  pgnMovetext,
  resultToPgn,
  switchClock,
  timeoutOutcome,
  toColor,
  tryMove,
} from './game-logic';
import { RealtimeService } from './realtime.service';

const whiteUser = alias(users, 'white_user');
const blackUser = alias(users, 'black_user');

interface PlayerRef {
  id: string;
  name: string;
}

/** A game being played right now. The server is the single source of truth for board and clock. */
interface LiveGame {
  matchId: string;
  tournamentId: string;
  tournamentName: string;
  baseMinutes: number;
  incrementSeconds: number;
  white: PlayerRef;
  black: PlayerRef;
  chess: Chess;
  clock: ClockState;
  drawOfferBy: Color | null;
  lastMove: { from: string; to: string } | null;
  startedAt: Date;
  ended: { result: MatchResult; termination: MatchTermination; endedAt: Date } | null;
  flagTimer?: NodeJS.Timeout;
  /** Serialises DB writes so they land in move order. */
  writes: Promise<unknown>;
}

/** What clients render. Sent on join and after every change. */
export interface MatchState {
  matchId: string;
  tournamentId: string;
  tournamentName: string;
  timeControl: string;
  white: PlayerRef;
  black: PlayerRef;
  fen: string;
  pgn: string;
  moves: string[];
  lastMove: { from: string; to: string } | null;
  turn: Color;
  inCheck: boolean;
  /** Remaining ms at `serverNow`; `running` is the side whose clock is ticking (null once over). */
  clock: { whiteMs: number; blackMs: number; running: Color | null };
  serverNow: number;
  status: 'ongoing' | 'completed';
  result: MatchResult | null;
  termination: MatchTermination | null;
  drawOfferBy: Color | null;
  startedAt: string;
  endedAt: string | null;
}

/** Back-off between attempts to save a result. The write is guarded on status, so retrying is safe. */
const SAVE_RESULT_RETRY_MS = [500, 2_000, 5_000, 15_000];

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const MOVE_ERRORS: Record<MoveError, { status: HttpStatus; message: string }> = {
  NOT_A_PLAYER: { status: HttpStatus.FORBIDDEN, message: 'Spectators cannot move' },
  NOT_YOUR_TURN: { status: HttpStatus.CONFLICT, message: "It's not your turn" },
  ILLEGAL_MOVE: { status: HttpStatus.UNPROCESSABLE_ENTITY, message: 'That move is not legal' },
  GAME_OVER: { status: HttpStatus.CONFLICT, message: 'The game is already over' },
};

@Injectable()
export class GameService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(GameService.name);
  private readonly games = new Map<string, LiveGame>();

  constructor(
    @InjectDb() private readonly db: Database,
    private readonly realtime: RealtimeService,
    private readonly events: DomainEvents,
  ) {}

  /**
   * After a restart, pick live games back up from the DB so clocks and flag timers keep going.
   *
   * Downtime isn't charged to anyone: each restored turn restarts at boot. The stored clocks are
   * as of the last move (`turnStartedAt`), so the side to move also gets back whatever they had
   * spent thinking before the crash — deliberately simple, and never unfair to the player.
   * One unreadable row is logged and skipped rather than blocking boot.
   */
  async onModuleInit() {
    const live = await this.loadMatchRows(eq(matches.status, 'ongoing'));
    const bootedAt = new Date();
    let restored = 0;
    for (const row of live) {
      try {
        const game = this.adopt({ ...row, match: { ...row.match, turnStartedAt: bootedAt } });
        if (!game.ended) this.persist(game);
        restored++;
      } catch (err) {
        this.logger.error(`Could not restore live match ${row.match.id}`, (err as Error).stack);
      }
    }
    if (live.length) this.logger.log(`Restored ${restored}/${live.length} live game(s)`);
  }

  onModuleDestroy() {
    for (const g of this.games.values()) clearTimeout(g.flagTimer);
  }

  // ------------------------------------------------------------------ creation

  /**
   * Create a match and seat both players atomically. The `active_players` primary key makes the
   * insert fail if either player is already seated elsewhere — the DB-level double-booking guard.
   * The tournament row is locked for the transaction; completion takes the same lock, so a match
   * can never be created in a tournament that has just closed.
   */
  async createMatch(tournamentId: string, white: PlayerRef, black: PlayerRef): Promise<MatchState> {
    const now = new Date();
    const { row, t } = await this.db.transaction(async (tx) => {
      const [t] = await tx.select().from(tournaments).where(eq(tournaments.id, tournamentId)).for('update');
      if (!t) throw notFound('Tournament');
      if (t.status !== 'ongoing') throw conflict('NOT_ONGOING', 'This tournament is no longer running');

      const chess = new Chess();
      const headers = gameHeaders({
        event: t.name,
        white: white.name,
        black: black.name,
        date: now,
        baseMinutes: t.timeControlMinutes,
        incrementSeconds: t.incrementSeconds,
      });
      for (const [k, v] of Object.entries(headers)) chess.setHeader(k, v);
      const baseMs = t.timeControlMinutes * 60_000;

      const [m] = await tx
        .insert(matches)
        .values({
          tournamentId,
          whiteId: white.id,
          blackId: black.id,
          fen: chess.fen(),
          pgn: chess.pgn(),
          whiteTimeMs: baseMs,
          blackTimeMs: baseMs,
          turnStartedAt: now,
          startedAt: now,
        })
        .returning();
      await tx.insert(activePlayers).values([
        { userId: white.id, matchId: m.id },
        { userId: black.id, matchId: m.id },
      ]);
      return { row: m, t };
    });

    const game = this.adopt({
      match: row,
      tournamentName: t.name,
      baseMinutes: t.timeControlMinutes,
      incrementSeconds: t.incrementSeconds,
      white,
      black,
    });
    this.events.emit('tournament.changed', { tournamentId });
    return this.toState(game);
  }

  // ------------------------------------------------------------------ queries

  /** Players see their own games; coaches may spectate any game. */
  async getState(user: AuthUser, matchId: string): Promise<MatchState> {
    const live = this.games.get(matchId);
    if (live) {
      this.assertCanView(user, live.white.id, live.black.id);
      return this.toState(live);
    }
    const [row] = await this.loadMatchRows(eq(matches.id, matchId));
    if (!row) throw notFound('Match');
    this.assertCanView(user, row.white.id, row.black.id);
    return this.toState(this.hydrate(row));
  }

  /**
   * Synchronous seat check against the games this process is running — including one whose
   * result is still being saved, since the player's DB seat is only freed once that succeeds.
   */
  isSeated(userId: string): boolean {
    for (const g of this.games.values()) if (g.white.id === userId || g.black.id === userId) return true;
    return false;
  }

  async activeMatchId(userId: string): Promise<string | null> {
    const [row] = await this.db
      .select({ matchId: activePlayers.matchId })
      .from(activePlayers)
      .where(eq(activePlayers.userId, userId));
    return row?.matchId ?? null;
  }

  // ------------------------------------------------------------------ player actions

  move(user: AuthUser, matchId: string, input: MoveInput): MatchState {
    const now = Date.now();
    // A move that arrives after the flag fell loses on time instead of being played.
    const game = this.requireLive(matchId, user.id, now);
    const color = this.colorOf(game, user.id);

    const r = tryMove(game.chess, color, input);
    if (!r.ok) {
      const e = MOVE_ERRORS[r.error];
      throw new AppException(e.status, r.error, e.message);
    }

    const switched = switchClock(game.clock, now, game.incrementSeconds * 1000);
    if ('flagged' in switched) {
      // Unreachable given the check above, but never let the clock go inconsistent.
      game.chess.undo();
      this.finish(game, timeoutOutcome(game.chess, switched.flagged), now);
      throw new AppException(HttpStatus.CONFLICT, 'GAME_OVER', 'Your time ran out');
    }
    game.clock = switched.clock;
    game.lastMove = { from: r.move.from, to: r.move.to };
    game.drawOfferBy = null; // making a move declines a pending offer

    const outcome = detectGameEnd(game.chess);
    if (outcome) {
      this.finish(game, outcome, now);
    } else {
      this.persist(game);
      this.scheduleFlag(game);
      this.broadcast(game);
    }
    return this.toState(game);
  }

  resign(user: AuthUser, matchId: string): MatchState {
    const now = Date.now();
    const game = this.requireLive(matchId, user.id, now);
    const color = this.requirePlayer(game, user.id);
    this.finish(game, { result: opposite(color), termination: 'resignation' }, now);
    return this.toState(game);
  }

  offerDraw(user: AuthUser, matchId: string): MatchState {
    const now = Date.now();
    const game = this.requireLive(matchId, user.id, now);
    const color = this.requirePlayer(game, user.id);
    if (game.drawOfferBy === opposite(color)) {
      // Both sides want a draw — treat a counter-offer as acceptance.
      this.finish(game, { result: 'draw', termination: 'draw_agreement' }, now);
    } else {
      game.drawOfferBy = color;
      this.broadcast(game);
    }
    return this.toState(game);
  }

  respondDraw(user: AuthUser, matchId: string, accept: boolean): MatchState {
    const now = Date.now();
    const game = this.requireLive(matchId, user.id, now);
    const color = this.requirePlayer(game, user.id);
    if (game.drawOfferBy !== opposite(color)) {
      throw new AppException(HttpStatus.CONFLICT, 'NO_DRAW_OFFER', 'There is no draw offer to respond to');
    }
    if (accept) {
      this.finish(game, { result: 'draw', termination: 'draw_agreement' }, now);
    } else {
      game.drawOfferBy = null;
      this.broadcast(game);
    }
    return this.toState(game);
  }

  // ------------------------------------------------------------------ internals

  private finish(game: LiveGame, outcome: GameOutcome, now: number) {
    if (game.ended) return; // flag timer and a resignation can race; first one wins
    clearTimeout(game.flagTimer);
    const t = clockAt(game.clock, now);
    game.clock = { ...game.clock, whiteMs: t.whiteMs, blackMs: t.blackMs, turnStartedAt: now };
    game.ended = { ...outcome, endedAt: new Date(now) };
    game.drawOfferBy = null;
    game.chess.setHeader('Result', resultToPgn(outcome.result));
    game.chess.setHeader('Termination', outcome.termination.replace(/_/g, ' '));
    this.broadcast(game);

    const values = {
      status: 'completed' as const,
      result: outcome.result,
      termination: outcome.termination,
      pgn: game.chess.pgn(),
      fen: game.chess.fen(),
      whiteTimeMs: t.whiteMs,
      blackTimeMs: t.blackMs,
      turnStartedAt: new Date(now),
      endedAt: new Date(now),
    };
    game.writes = game.writes
      .then(() => this.saveResult(game.matchId, values))
      .then((saved) => {
        // Until the result is stored the game stays in memory (players stay seated, as in the DB).
        if (!saved) return;
        this.games.delete(game.matchId);
        this.events.emit('match.ended', { matchId: game.matchId, tournamentId: game.tournamentId });
        this.events.emit('tournament.changed', { tournamentId: game.tournamentId });
      })
      .catch((err) => this.logger.error(`Failed to wrap up ${game.matchId}`, (err as Error).stack));
  }

  /** Store a final result and free both seats, retrying with back-off. Resolves false if it never lands. */
  private async saveResult(matchId: string, values: Partial<Match>): Promise<boolean> {
    for (let attempt = 1; ; attempt++) {
      try {
        await this.db.transaction(async (tx) => {
          await tx
            .update(matches)
            .set(values)
            .where(and(eq(matches.id, matchId), eq(matches.status, 'ongoing')));
          await tx.delete(activePlayers).where(eq(activePlayers.matchId, matchId));
        });
        return true;
      } catch (err) {
        const delay = SAVE_RESULT_RETRY_MS[attempt - 1];
        if (delay === undefined) {
          this.logger.error(
            `GAVE UP saving the result of match ${matchId} after ${attempt} attempts — it stays 'ongoing' ` +
              `in the DB with both players seated. Intended result: ${values.result} (${values.termination})`,
            (err as Error).stack,
          );
          return false;
        }
        this.logger.warn(`Saving result of ${matchId} failed (attempt ${attempt}), retrying in ${delay}ms: ${(err as Error).message}`);
        await sleep(delay);
      }
    }
  }

  private persist(game: LiveGame) {
    const snapshot = {
      pgn: game.chess.pgn(),
      fen: game.chess.fen(),
      whiteTimeMs: game.clock.whiteMs,
      blackTimeMs: game.clock.blackMs,
      turnStartedAt: new Date(game.clock.turnStartedAt),
    };
    game.writes = game.writes
      .then(() =>
        this.db
          .update(matches)
          .set(snapshot)
          .where(and(eq(matches.id, game.matchId), eq(matches.status, 'ongoing'))),
      )
      .catch((err) => this.logger.error(`Failed to persist move in ${game.matchId}`, err));
  }

  private scheduleFlag(game: LiveGame) {
    clearTimeout(game.flagTimer);
    const ms = msUntilFlag(game.clock, Date.now());
    game.flagTimer = setTimeout(() => {
      if (game.ended) return;
      const now = Date.now();
      if (msUntilFlag(game.clock, now) <= 0) {
        this.finish(game, timeoutOutcome(game.chess, game.clock.turn), now);
      } else {
        this.scheduleFlag(game); // woke up early; try again
      }
    }, ms + 25);
  }

  private broadcast(game: LiveGame) {
    this.realtime.toMatch(game.matchId, 'match:state', this.toState(game));
  }

  private toState(game: LiveGame): MatchState {
    const now = Date.now();
    const t = game.ended ? game.clock : clockAt(game.clock, now);
    return {
      matchId: game.matchId,
      tournamentId: game.tournamentId,
      tournamentName: game.tournamentName,
      timeControl: `${game.baseMinutes}+${game.incrementSeconds}`,
      white: game.white,
      black: game.black,
      fen: game.chess.fen(),
      pgn: game.chess.pgn(),
      moves: game.chess.history(),
      lastMove: game.lastMove,
      turn: toColor(game.chess.turn()),
      inCheck: game.chess.inCheck(),
      clock: { whiteMs: t.whiteMs, blackMs: t.blackMs, running: game.ended ? null : game.clock.turn },
      serverNow: now,
      status: game.ended ? 'completed' : 'ongoing',
      result: game.ended?.result ?? null,
      termination: game.ended?.termination ?? null,
      drawOfferBy: game.drawOfferBy,
      startedAt: game.startedAt.toISOString(),
      endedAt: game.ended?.endedAt.toISOString() ?? null,
    };
  }

  /**
   * The game, if still in progress. Also where a fallen flag is noticed before the timer fires:
   * once time is up, no move, resignation or draw can change the result.
   */
  private requireLive(matchId: string, userId: string, now: number): LiveGame {
    const game = this.games.get(matchId);
    if (!game || game.ended) throw new AppException(HttpStatus.CONFLICT, 'GAME_OVER', 'This game is not in progress');
    if (msUntilFlag(game.clock, now) <= 0) {
      const flagged = game.clock.turn;
      this.finish(game, timeoutOutcome(game.chess, flagged), now);
      const message = this.colorOf(game, userId) === flagged ? 'Your time ran out' : 'Time ran out';
      throw new AppException(HttpStatus.CONFLICT, 'GAME_OVER', message);
    }
    return game;
  }

  private colorOf(game: LiveGame, userId: string): Color | null {
    return game.white.id === userId ? 'white' : game.black.id === userId ? 'black' : null;
  }

  private requirePlayer(game: LiveGame, userId: string): Color {
    const color = this.colorOf(game, userId);
    if (!color) throw forbidden('Only the players can do that');
    return color;
  }

  private assertCanView(user: AuthUser, whiteId: string, blackId: string) {
    if (user.role === 'coach') return;
    if (user.id !== whiteId && user.id !== blackId) throw forbidden('You are not playing in this match');
  }

  /**
   * Register a live game in memory (new or restored) and arm its flag timer — or end it right away
   * if the restored position is already over (say the last move was saved but not the result)
   * or the side to move is out of time.
   */
  private adopt(row: MatchRow): LiveGame {
    const game = this.hydrate(row);
    this.games.set(game.matchId, game);
    const now = Date.now();
    const outcome = detectGameEnd(game.chess);
    if (outcome) {
      this.finish(game, outcome, now);
    } else if (msUntilFlag(game.clock, now) <= 0) {
      this.finish(game, timeoutOutcome(game.chess, game.clock.turn), now);
    } else {
      this.scheduleFlag(game);
    }
    return game;
  }

  private hydrate(row: MatchRow): LiveGame {
    const m = row.match;
    const chess = this.loadBoard(row);
    const verbose = chess.history({ verbose: true });
    const last = verbose[verbose.length - 1];
    return {
      matchId: m.id,
      tournamentId: m.tournamentId,
      tournamentName: row.tournamentName,
      baseMinutes: row.baseMinutes,
      incrementSeconds: row.incrementSeconds,
      white: row.white,
      black: row.black,
      chess,
      clock: {
        whiteMs: m.whiteTimeMs,
        blackMs: m.blackTimeMs,
        turnStartedAt: m.turnStartedAt.getTime(),
        turn: toColor(chess.turn()),
      },
      drawOfferBy: null,
      lastMove: last ? { from: last.from, to: last.to } : null,
      startedAt: m.startedAt,
      ended:
        m.status === 'completed' && m.result && m.termination
          ? { result: m.result, termination: m.termination, endedAt: m.endedAt ?? m.startedAt }
          : null,
      writes: Promise.resolve(),
    };
  }

  /**
   * Rebuild the board from the stored PGN. Older rows can hold tags chess.js won't parse (an
   * unescaped `"` in a name); then replay just the moves under freshly built tags, and as a last
   * resort start from the stored FEN without the move list — never fail boot or a page load.
   */
  private loadBoard(row: MatchRow): Chess {
    const m = row.match;
    const chess = new Chess();
    if (!m.pgn) return chess;
    try {
      chess.loadPgn(m.pgn);
      return chess;
    } catch (err) {
      this.logger.warn(`Match ${m.id} has an unreadable PGN (${(err as Error).message}); rebuilding it`);
    }
    try {
      const rebuilt = new Chess();
      rebuilt.loadPgn(pgnMovetext(m.pgn));
      const headers = gameHeaders({
        event: row.tournamentName,
        white: row.white.name,
        black: row.black.name,
        date: m.startedAt,
        baseMinutes: row.baseMinutes,
        incrementSeconds: row.incrementSeconds,
      });
      for (const [k, v] of Object.entries(headers)) rebuilt.setHeader(k, v);
      if (m.result) rebuilt.setHeader('Result', resultToPgn(m.result));
      if (m.termination) rebuilt.setHeader('Termination', m.termination.replace(/_/g, ' '));
      return rebuilt;
    } catch {
      this.logger.warn(`Match ${m.id}: moves unreadable too; falling back to the stored FEN`);
      return new Chess(m.fen);
    }
  }

  private async loadMatchRows(where: SQL): Promise<MatchRow[]> {
    return this.db
      .select({
        match: matches,
        tournamentName: tournaments.name,
        baseMinutes: tournaments.timeControlMinutes,
        incrementSeconds: tournaments.incrementSeconds,
        white: { id: whiteUser.id, name: whiteUser.name },
        black: { id: blackUser.id, name: blackUser.name },
      })
      .from(matches)
      .innerJoin(tournaments, eq(tournaments.id, matches.tournamentId))
      .innerJoin(whiteUser, eq(whiteUser.id, matches.whiteId))
      .innerJoin(blackUser, eq(blackUser.id, matches.blackId))
      .where(where);
  }
}

interface MatchRow {
  match: Match;
  tournamentName: string;
  baseMinutes: number;
  incrementSeconds: number;
  white: PlayerRef;
  black: PlayerRef;
}
