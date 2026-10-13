import { sql } from 'drizzle-orm';
import {
  check,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

export const userRole = pgEnum('user_role', ['coach', 'student']);
export const tournamentStatus = pgEnum('tournament_status', ['draft', 'open', 'ongoing', 'completed']);
export const matchStatus = pgEnum('match_status', ['ongoing', 'completed']);
export const matchResult = pgEnum('match_result', ['white', 'black', 'draw']);
export const matchTermination = pgEnum('match_termination', [
  'checkmate',
  'resignation',
  'timeout',
  'stalemate',
  'draw_agreement',
  'threefold_repetition',
  'fifty_move_rule',
  'insufficient_material',
]);

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 120 }).notNull(),
  passwordHash: text('password_hash').notNull(),
  role: userRole('role').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const tournaments = pgTable(
  'tournaments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 120 }).notNull(),
    description: text('description'),
    /** Base time per player, in minutes ("5" in 5+3). */
    timeControlMinutes: integer('time_control_minutes').notNull(),
    /** Increment added after each move, in seconds ("3" in 5+3). */
    incrementSeconds: integer('increment_seconds').notNull().default(0),
    startsAt: timestamp('starts_at', { withTimezone: true }).notNull(),
    status: tournamentStatus('status').notNull().default('draft'),
    createdById: uuid('created_by_id')
      .notNull()
      .references(() => users.id),
    winnerId: uuid('winner_id').references(() => users.id),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('tournaments_status_idx').on(t.status),
    check('tournaments_time_control_chk', sql`${t.timeControlMinutes} between 1 and 180`),
    check('tournaments_increment_chk', sql`${t.incrementSeconds} between 0 and 60`),
  ],
);

export const tournamentParticipants = pgTable(
  'tournament_participants',
  {
    tournamentId: uuid('tournament_id')
      .notNull()
      .references(() => tournaments.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    joinedAt: timestamp('joined_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.tournamentId, t.userId] }), index('participants_user_idx').on(t.userId)],
);

export const matches = pgTable(
  'matches',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tournamentId: uuid('tournament_id')
      .notNull()
      .references(() => tournaments.id, { onDelete: 'cascade' }),
    whiteId: uuid('white_id')
      .notNull()
      .references(() => users.id),
    blackId: uuid('black_id')
      .notNull()
      .references(() => users.id),
    status: matchStatus('status').notNull().default('ongoing'),
    result: matchResult('result'),
    termination: matchTermination('termination'),
    pgn: text('pgn').notNull().default(''),
    fen: text('fen').notNull(),
    /** Clock snapshot as of `turnStartedAt` (the side to move is still ticking from there). */
    whiteTimeMs: integer('white_time_ms').notNull(),
    blackTimeMs: integer('black_time_ms').notNull(),
    turnStartedAt: timestamp('turn_started_at', { withTimezone: true }).notNull(),
    startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
    endedAt: timestamp('ended_at', { withTimezone: true }),
  },
  (t) => [
    index('matches_tournament_idx').on(t.tournamentId),
    index('matches_white_idx').on(t.whiteId),
    index('matches_black_idx').on(t.blackId),
    check('matches_distinct_players_chk', sql`${t.whiteId} <> ${t.blackId}`),
  ],
);

/**
 * One row per player currently seated in a live game. The primary key on user_id is the
 * database-level guarantee that a player is never double-booked, even if two pairing attempts
 * race (e.g. across processes). Rows are inserted with the match and deleted when it ends.
 */
export const activePlayers = pgTable('active_players', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  matchId: uuid('match_id')
    .notNull()
    .references(() => matches.id, { onDelete: 'cascade' }),
});

export type User = typeof users.$inferSelect;
export type Tournament = typeof tournaments.$inferSelect;
export type Match = typeof matches.$inferSelect;
export type Role = (typeof userRole.enumValues)[number];
export type TournamentStatus = (typeof tournamentStatus.enumValues)[number];
export type MatchResult = (typeof matchResult.enumValues)[number];
export type MatchTermination = (typeof matchTermination.enumValues)[number];
