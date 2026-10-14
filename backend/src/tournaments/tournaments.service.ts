import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { and, asc, count, desc, eq, inArray, ne, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { AppException, conflict, notFound } from '../common/app-exception';
import { AuthUser } from '../common/auth.decorators';
import { DomainEvents } from '../common/domain-events';
import { Database } from '../db/db';
import { InjectDb } from '../db/db.module';
import { matches, tournamentParticipants, tournaments, users, type Tournament, type TournamentStatus } from '../db/schema';
import { computeStandings, pickWinner, Standing } from './standings';
import { CreateTournamentDto, UpdateTournamentDto } from './tournament.dto';
import {
  checkCanJoin,
  checkCanLeave,
  checkStatusTransition,
  RuleViolation,
  totalRoundRobinGames,
} from './tournament-rules';

const whiteUser = alias(users, 'white_user');
const blackUser = alias(users, 'black_user');
const winnerUser = alias(users, 'winner_user');

/** The pool or an open transaction. */
type Executor = Pick<Database, 'select'>;

const ruleError = (v: RuleViolation) => new AppException(HttpStatus.CONFLICT, v.code, v.message);

@Injectable()
export class TournamentsService {
  private readonly logger = new Logger(TournamentsService.name);

  constructor(
    @InjectDb() private readonly db: Database,
    private readonly events: DomainEvents,
  ) {
    // Round-robin finished → close the tournament automatically.
    this.events.on('match.ended', ({ tournamentId }) => {
      this.completeIfFinished(tournamentId).catch((err) => this.logger.error(err));
    });
  }

  // ---------------------------------------------------------------- reads

  async list(user: AuthUser, statuses?: TournamentStatus[]) {
    const filters = [];
    if (statuses?.length) filters.push(inArray(tournaments.status, statuses));
    // Drafts are the coach's work in progress.
    if (user.role === 'student') filters.push(ne(tournaments.status, 'draft'));

    const rows = await this.db
      .select({
        t: tournaments,
        winnerName: winnerUser.name,
        participantCount: sql<number>`(select count(*)::int from ${tournamentParticipants} p where p.tournament_id = ${tournaments.id})`,
        joined: sql<boolean>`exists(select 1 from ${tournamentParticipants} p where p.tournament_id = ${tournaments.id} and p.user_id = ${user.id})`,
      })
      .from(tournaments)
      .leftJoin(winnerUser, eq(winnerUser.id, tournaments.winnerId))
      .where(filters.length ? and(...filters) : undefined)
      .orderBy(asc(tournaments.startsAt));

    return rows.map((r) => this.present(r.t, r.winnerName, r.participantCount, r.joined));
  }

  async get(user: AuthUser, id: string) {
    const t = await this.findVisible(user, id);
    const all = await this.participants(id);
    // Emails are for the coach's roster; students only see names.
    const participants = user.role === 'coach' ? all : all.map(({ email: _email, ...p }) => p);
    const [winner] = t.winnerId ? await this.db.select({ name: users.name }).from(users).where(eq(users.id, t.winnerId)) : [];
    const progress = await this.progress(id, participants.length);
    return {
      ...this.present(t, winner?.name ?? null, participants.length, participants.some((p) => p.id === user.id)),
      participants,
      progress,
    };
  }

  /** Leaderboard + headline stats. Visible to coaches and to any student who can see the tournament. */
  async leaderboard(user: AuthUser, id: string) {
    const t = await this.findVisible(user, id);
    const standings = await this.standings(id);
    const progress = await this.progress(id, standings.length);
    const [{ decisive, draws }] = await this.db
      .select({
        decisive: sql<number>`count(*) filter (where ${matches.result} in ('white','black'))::int`,
        draws: sql<number>`count(*) filter (where ${matches.result} = 'draw')::int`,
      })
      .from(matches)
      .where(and(eq(matches.tournamentId, id), eq(matches.status, 'completed')));
    const winner = t.winnerId ? (standings.find((s) => s.userId === t.winnerId) ?? null) : null;
    return { tournamentId: id, status: t.status, standings, winner, stats: { ...progress, decisive, draws } };
  }

  async matches(user: AuthUser, id: string) {
    await this.findVisible(user, id);
    const rows = await this.db
      .select({
        id: matches.id,
        status: matches.status,
        result: matches.result,
        termination: matches.termination,
        startedAt: matches.startedAt,
        endedAt: matches.endedAt,
        white: { id: whiteUser.id, name: whiteUser.name },
        black: { id: blackUser.id, name: blackUser.name },
      })
      .from(matches)
      .innerJoin(whiteUser, eq(whiteUser.id, matches.whiteId))
      .innerJoin(blackUser, eq(blackUser.id, matches.blackId))
      .where(eq(matches.tournamentId, id))
      .orderBy(desc(matches.startedAt));
    return rows;
  }

  /** `db` lets completion read standings inside its own transaction. */
  async standings(tournamentId: string, db: Executor = this.db): Promise<Standing[]> {
    const players = await this.participants(tournamentId, db);
    const games = await db
      .select({ whiteId: matches.whiteId, blackId: matches.blackId, result: matches.result })
      .from(matches)
      .where(and(eq(matches.tournamentId, tournamentId), eq(matches.status, 'completed')));
    return computeStandings(
      players,
      games.filter((g): g is typeof g & { result: NonNullable<typeof g.result> } => g.result !== null),
    );
  }

  async participants(tournamentId: string, db: Executor = this.db) {
    return db
      .select({ id: users.id, name: users.name, email: users.email, joinedAt: tournamentParticipants.joinedAt })
      .from(tournamentParticipants)
      .innerJoin(users, eq(users.id, tournamentParticipants.userId))
      .where(eq(tournamentParticipants.tournamentId, tournamentId))
      .orderBy(asc(users.name));
  }

  async findOrThrow(id: string): Promise<Tournament> {
    const [t] = await this.db.select().from(tournaments).where(eq(tournaments.id, id)).limit(1);
    if (!t) throw notFound('Tournament');
    return t;
  }

  async isParticipant(tournamentId: string, userId: string): Promise<boolean> {
    const [row] = await this.db
      .select({ one: sql`1` })
      .from(tournamentParticipants)
      .where(and(eq(tournamentParticipants.tournamentId, tournamentId), eq(tournamentParticipants.userId, userId)))
      .limit(1);
    return !!row;
  }

  // ---------------------------------------------------------------- coach writes

  async create(coach: AuthUser, dto: CreateTournamentDto) {
    const [t] = await this.db
      .insert(tournaments)
      .values({
        name: dto.name,
        description: dto.description || null,
        timeControlMinutes: dto.timeControlMinutes,
        incrementSeconds: dto.incrementSeconds ?? 0,
        startsAt: new Date(dto.startsAt),
        status: dto.status ?? 'draft',
        createdById: coach.id,
      })
      .returning();
    return this.present(t, null, 0, false);
  }

  async update(id: string, dto: UpdateTournamentDto) {
    const t = await this.findOrThrow(id);
    const changesRules = dto.timeControlMinutes !== undefined || dto.incrementSeconds !== undefined;
    if (t.status === 'completed') throw conflict('LOCKED', 'A completed tournament can no longer be edited');
    if (changesRules && t.status === 'ongoing') {
      throw conflict('LOCKED', 'The time control cannot change once games have started');
    }
    const [updated] = await this.db
      .update(tournaments)
      .set({
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description || null }),
        ...(dto.timeControlMinutes !== undefined && { timeControlMinutes: dto.timeControlMinutes }),
        ...(dto.incrementSeconds !== undefined && { incrementSeconds: dto.incrementSeconds }),
        ...(dto.startsAt !== undefined && { startsAt: new Date(dto.startsAt) }),
        updatedAt: new Date(),
      })
      .where(eq(tournaments.id, id))
      .returning();
    this.events.emit('tournament.changed', { tournamentId: id });
    return this.present(updated, null, (await this.participants(id)).length, false);
  }

  async setStatus(coach: AuthUser, id: string, status: TournamentStatus) {
    const t = await this.findOrThrow(id);
    const [{ n }] = await this.db
      .select({ n: count() })
      .from(tournamentParticipants)
      .where(eq(tournamentParticipants.tournamentId, id));
    const violation = checkStatusTransition(t.status, status, n);
    if (violation) throw ruleError(violation);
    if (status === 'completed') {
      await this.complete(id, { force: true });
    } else if (status !== t.status) {
      await this.db.update(tournaments).set({ status, updatedAt: new Date() }).where(eq(tournaments.id, id));
      this.events.emit('tournament.changed', { tournamentId: id });
    }
    return this.get(coach, id);
  }

  async remove(id: string) {
    const t = await this.findOrThrow(id);
    if (t.status === 'ongoing' || t.status === 'completed') {
      throw conflict('LOCKED', 'Tournaments that have started keep their history and cannot be deleted');
    }
    await this.db.delete(tournaments).where(eq(tournaments.id, id));
    this.events.emit('tournament.closed', { tournamentId: id });
    return { id, deleted: true };
  }

  async addParticipant(id: string, userId: string) {
    const t = await this.findOrThrow(id);
    if (t.status !== 'draft' && t.status !== 'open') {
      throw conflict('LOCKED', 'Players can only be added before the tournament starts');
    }
    const [student] = await this.db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!student || student.role !== 'student') throw notFound('Student');
    if (await this.isParticipant(id, userId)) throw conflict('ALREADY_JOINED', `${student.name} is already registered`);
    await this.db.insert(tournamentParticipants).values({ tournamentId: id, userId });
    this.events.emit('tournament.changed', { tournamentId: id });
    return this.participants(id);
  }

  async removeParticipant(id: string, userId: string) {
    const t = await this.findOrThrow(id);
    if (t.status !== 'draft' && t.status !== 'open') {
      throw conflict('LOCKED', 'Players can only be removed before the tournament starts');
    }
    await this.db
      .delete(tournamentParticipants)
      .where(and(eq(tournamentParticipants.tournamentId, id), eq(tournamentParticipants.userId, userId)));
    this.events.emit('tournament.changed', { tournamentId: id });
    return this.participants(id);
  }

  listStudents() {
    return this.db
      .select({ id: users.id, name: users.name, email: users.email })
      .from(users)
      .where(eq(users.role, 'student'))
      .orderBy(asc(users.name));
  }

  // ---------------------------------------------------------------- student writes

  async join(student: AuthUser, id: string) {
    const t = await this.findVisible(student, id);
    const violation = checkCanJoin({
      role: student.role,
      status: t.status,
      alreadyParticipant: await this.isParticipant(id, student.id),
    });
    if (violation) throw ruleError(violation);
    // The composite PK makes a double-click race harmless.
    await this.db.insert(tournamentParticipants).values({ tournamentId: id, userId: student.id }).onConflictDoNothing();
    this.events.emit('tournament.changed', { tournamentId: id });
    return this.get(student, id);
  }

  async leave(student: AuthUser, id: string) {
    const t = await this.findVisible(student, id);
    const violation = checkCanLeave({ status: t.status, isParticipant: await this.isParticipant(id, student.id) });
    if (violation) throw ruleError(violation);
    await this.db
      .delete(tournamentParticipants)
      .where(and(eq(tournamentParticipants.tournamentId, id), eq(tournamentParticipants.userId, student.id)));
    this.events.emit('tournament.changed', { tournamentId: id });
    return this.get(student, id);
  }

  // ---------------------------------------------------------------- completion

  private async completeIfFinished(tournamentId: string) {
    const t = await this.findOrThrow(tournamentId);
    if (t.status !== 'ongoing') return;
    const { played, total, live } = await this.progress(tournamentId, (await this.participants(tournamentId)).length);
    if (live === 0 && total > 0 && played >= total) await this.complete(tournamentId, { force: false });
  }

  /**
   * Close the tournament and record the winner (null when the lead is shared on every tiebreak).
   * Runs under a lock on the tournament row — the same lock match creation takes — so no game can
   * start between "no live games" and "completed".
   */
  private async complete(id: string, { force }: { force: boolean }) {
    const done = await this.db.transaction(async (tx) => {
      await tx.select({ id: tournaments.id }).from(tournaments).where(eq(tournaments.id, id)).for('update');
      const [{ live }] = await tx
        .select({ live: count() })
        .from(matches)
        .where(and(eq(matches.tournamentId, id), eq(matches.status, 'ongoing')));
      if (live > 0) {
        if (!force) return [];
        throw conflict('LIVE_MATCHES', `Wait for the ${live} live ${live === 1 ? 'game' : 'games'} to finish before ending the tournament`);
      }
      const winner = pickWinner(await this.standings(id, tx));
      // Guarded update: only one caller can flip ongoing → completed.
      return tx
        .update(tournaments)
        .set({ status: 'completed', winnerId: winner?.userId ?? null, completedAt: new Date(), updatedAt: new Date() })
        .where(and(eq(tournaments.id, id), eq(tournaments.status, 'ongoing')))
        .returning({ id: tournaments.id });
    });
    if (done.length) {
      this.events.emit('tournament.closed', { tournamentId: id });
      this.events.emit('tournament.changed', { tournamentId: id });
    }
  }

  private async progress(tournamentId: string, playerCount: number) {
    const [row] = await this.db
      .select({
        played: sql<number>`count(*) filter (where ${matches.status} = 'completed')::int`,
        live: sql<number>`count(*) filter (where ${matches.status} = 'ongoing')::int`,
      })
      .from(matches)
      .where(eq(matches.tournamentId, tournamentId));
    return { played: row.played, live: row.live, total: totalRoundRobinGames(playerCount) };
  }

  // ---------------------------------------------------------------- helpers

  /** Students get a 404 (not 403) for drafts so they can't probe for them. */
  private async findVisible(user: AuthUser, id: string): Promise<Tournament> {
    const t = await this.findOrThrow(id);
    if (user.role === 'student' && t.status === 'draft') throw notFound('Tournament');
    return t;
  }

  private present(t: Tournament, winnerName: string | null, participantCount: number, joined: boolean) {
    return {
      id: t.id,
      name: t.name,
      description: t.description,
      timeControlMinutes: t.timeControlMinutes,
      incrementSeconds: t.incrementSeconds,
      timeControl: `${t.timeControlMinutes}+${t.incrementSeconds}`,
      startsAt: t.startsAt,
      status: t.status,
      winner: t.winnerId ? { id: t.winnerId, name: winnerName } : null,
      completedAt: t.completedAt,
      participantCount,
      joined,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    };
  }
}
