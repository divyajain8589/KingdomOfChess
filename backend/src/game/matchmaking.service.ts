import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { AppException } from '../common/app-exception';
import { AuthUser } from '../common/auth.decorators';
import { DomainEvents } from '../common/domain-events';
import { Database } from '../db/db';
import { InjectDb } from '../db/db.module';
import { matches } from '../db/schema';
import { TournamentsService } from '../tournaments/tournaments.service';
import { assignColors, checkCanQueue, pairKey, pickOpponent, QueueEntry } from '../tournaments/tournament-rules';
import { GameService, MatchState } from './game.service';
import { RealtimeService } from './realtime.service';

interface Waiting extends QueueEntry {
  name: string;
}

export interface QueueStatus {
  tournamentId: string;
  queued: boolean;
  waiting: number;
}

/**
 * Per-tournament waiting rooms, held in memory.
 *
 * Concurrency: all queue mutation happens in synchronous blocks (no `await` between "pick an
 * opponent" and "remove both from the queue"), so on Node's single thread two requests can never
 * grab the same waiting player. The `active_players` PK in Postgres is the backstop if this ever
 * ran in more than one process.
 */
@Injectable()
export class MatchmakingService {
  private readonly logger = new Logger(MatchmakingService.name);
  private readonly queues = new Map<string, Waiting[]>();
  /** userId → tournamentId: a player waits in at most one queue at a time. */
  private readonly queuedIn = new Map<string, string>();
  /** Players removed from a queue whose match is being written to the DB right now. */
  private readonly pairing = new Set<string>();

  constructor(
    @InjectDb() private readonly db: Database,
    private readonly tournaments: TournamentsService,
    private readonly games: GameService,
    private readonly realtime: RealtimeService,
    events: DomainEvents,
  ) {
    events.on('tournament.closed', ({ tournamentId }) => this.dropQueue(tournamentId));
  }

  status(userId: string, tournamentId: string): QueueStatus {
    return {
      tournamentId,
      queued: this.queuedIn.get(userId) === tournamentId,
      waiting: this.queues.get(tournamentId)?.length ?? 0,
    };
  }

  /**
   * Enter the queue. Returns the new match straight away if someone suitable was waiting.
   * `isConnected` is checked once the async checks are done: a client that went away meanwhile
   * is neither queued nor paired (its disconnect handler has already run).
   */
  async join(
    user: AuthUser,
    tournamentId: string,
    isConnected: () => boolean = () => true,
  ): Promise<{ queue: QueueStatus; match: MatchState | null }> {
    if (user.role !== 'student') throw new AppException(HttpStatus.FORBIDDEN, 'FORBIDDEN', 'Only students can play');

    // ---- async: gather facts and check the rules
    const t = await this.tournaments.findOrThrow(tournamentId);
    const [isParticipant, activeMatchId, history, standings] = await Promise.all([
      this.tournaments.isParticipant(tournamentId, user.id),
      this.games.activeMatchId(user.id),
      this.db
        .select({ whiteId: matches.whiteId, blackId: matches.blackId })
        .from(matches)
        .where(eq(matches.tournamentId, tournamentId)),
      this.tournaments.standings(tournamentId),
    ]);
    const played = new Set(history.map((m) => pairKey(m.whiteId, m.blackId)));
    const opponentsRemaining = standings.filter(
      (s) => s.userId !== user.id && !played.has(pairKey(user.id, s.userId)),
    ).length;
    const violation = checkCanQueue({ status: t.status, isParticipant, activeMatchId, opponentsRemaining });
    if (violation) throw new AppException(HttpStatus.CONFLICT, violation.code, violation.message);

    // ---- sync: claim a slot or an opponent atomically
    if (!isConnected()) return { queue: this.status(user.id, tournamentId), match: null };
    if (this.pairing.has(user.id)) {
      throw new AppException(HttpStatus.CONFLICT, 'IN_MATCH', 'Your game is being set up');
    }
    // `activeMatchId` above may be stale (another tab got paired while we awaited); this isn't.
    if (this.games.isSeated(user.id)) {
      throw new AppException(HttpStatus.CONFLICT, 'IN_MATCH', 'Finish your current game first');
    }
    const elsewhere = this.queuedIn.get(user.id);
    if (elsewhere && elsewhere !== tournamentId) this.remove(user.id);

    const queue = this.queues.get(tournamentId) ?? [];
    this.queues.set(tournamentId, queue);
    const points = new Map(standings.map((s) => [s.userId, s.points]));
    const candidates = queue.filter((w) => !this.games.isSeated(w.userId));
    const opponent = pickOpponent(user.id, candidates, played, points);

    if (!opponent) {
      if (!queue.some((w) => w.userId === user.id)) {
        queue.push({ userId: user.id, name: user.name, enqueuedAt: Date.now() });
        this.queuedIn.set(user.id, tournamentId);
      }
      this.broadcastWaiting(tournamentId);
      return { queue: this.status(user.id, tournamentId), match: null };
    }

    const waiter = queue.find((w) => w.userId === opponent.userId)!;
    this.remove(user.id);
    this.remove(waiter.userId);
    this.pairing.add(user.id).add(waiter.userId);

    // ---- async again: write the match. Both players are out of every queue by now.
    try {
      const whiteCounts = new Map<string, number>();
      for (const m of history) whiteCounts.set(m.whiteId, (whiteCounts.get(m.whiteId) ?? 0) + 1);
      const { whiteId } = assignColors(waiter.userId, user.id, whiteCounts);
      const me = { id: user.id, name: user.name };
      const them = { id: waiter.userId, name: waiter.name };
      const match =
        whiteId === me.id
          ? await this.games.createMatch(tournamentId, me, them)
          : await this.games.createMatch(tournamentId, them, me);

      const found = { matchId: match.matchId, tournamentId };
      this.realtime.toUser(me.id, 'match:found', found);
      this.realtime.toUser(them.id, 'match:found', found);
      this.broadcastWaiting(tournamentId);
      return { queue: this.status(user.id, tournamentId), match };
    } catch (err) {
      this.logger.warn(`Pairing failed in ${tournamentId}: ${(err as Error).message}`);
      // The tournament closed (or vanished) under us: its queue is gone, so don't refill it.
      const code = err instanceof AppException ? (err.getResponse() as { code?: string }).code : undefined;
      if (code === 'NOT_ONGOING' || code === 'NOT_FOUND') {
        this.realtime.toUser(waiter.userId, 'queue:status', { tournamentId, queued: false, waiting: 0 });
        throw err;
      }
      // Put the waiting player back where they were (unless they got a game meanwhile);
      // the requester gets an error and can retry.
      if (!this.queuedIn.has(waiter.userId) && !this.games.isSeated(waiter.userId)) {
        queue.unshift(waiter);
        this.queuedIn.set(waiter.userId, tournamentId);
        this.broadcastWaiting(tournamentId);
      }
      throw new AppException(HttpStatus.CONFLICT, 'PAIRING_FAILED', 'Could not start the game. Please try again.');
    } finally {
      this.pairing.delete(user.id);
      this.pairing.delete(waiter.userId);
    }
  }

  leave(userId: string, tournamentId?: string): QueueStatus | null {
    const t = this.queuedIn.get(userId);
    if (!t || (tournamentId && t !== tournamentId)) {
      return tournamentId ? this.status(userId, tournamentId) : null;
    }
    this.remove(userId);
    this.broadcastWaiting(t);
    return this.status(userId, t);
  }

  private remove(userId: string) {
    const t = this.queuedIn.get(userId);
    if (!t) return;
    this.queuedIn.delete(userId);
    const q = this.queues.get(t);
    if (!q) return;
    const i = q.findIndex((w) => w.userId === userId);
    if (i >= 0) q.splice(i, 1);
  }

  private dropQueue(tournamentId: string) {
    const q = this.queues.get(tournamentId) ?? [];
    for (const w of q) {
      this.queuedIn.delete(w.userId);
      this.realtime.toUser(w.userId, 'queue:status', { tournamentId, queued: false, waiting: 0 });
    }
    this.queues.delete(tournamentId);
  }

  private broadcastWaiting(tournamentId: string) {
    const q = this.queues.get(tournamentId) ?? [];
    for (const w of q) this.realtime.toUser(w.userId, 'queue:status', this.status(w.userId, tournamentId));
  }
}
