import type { Role, TournamentStatus } from '../db/schema';

/**
 * Pure business rules for joining, queueing and pairing. Services gather the facts from the DB
 * and ask these functions for a decision, so the rules themselves are unit-testable.
 */

export type RuleViolation = { code: string; message: string };

export function checkCanJoin(input: {
  role: Role;
  status: TournamentStatus;
  alreadyParticipant: boolean;
}): RuleViolation | null {
  if (input.role !== 'student') return { code: 'ROLE', message: 'Only students can join tournaments' };
  if (input.alreadyParticipant) return { code: 'ALREADY_JOINED', message: 'You have already joined this tournament' };
  if (input.status !== 'open') {
    return { code: 'NOT_OPEN', message: 'This tournament is not open for registration' };
  }
  return null;
}

export function checkCanLeave(input: { status: TournamentStatus; isParticipant: boolean }): RuleViolation | null {
  if (!input.isParticipant) return { code: 'NOT_JOINED', message: 'You are not in this tournament' };
  if (input.status !== 'open') {
    return { code: 'LOCKED', message: 'You can only withdraw while registration is open' };
  }
  return null;
}

export function checkCanQueue(input: {
  status: TournamentStatus;
  isParticipant: boolean;
  activeMatchId: string | null;
  opponentsRemaining: number;
}): RuleViolation | null {
  if (!input.isParticipant) return { code: 'NOT_JOINED', message: 'Join the tournament first' };
  if (input.status !== 'ongoing') return { code: 'NOT_ONGOING', message: 'Matchmaking opens when the tournament starts' };
  if (input.activeMatchId) return { code: 'IN_MATCH', message: 'Finish your current game first' };
  if (input.opponentsRemaining <= 0) {
    return { code: 'ALL_PLAYED', message: 'You have played everyone in this tournament' };
  }
  return null;
}

/** Allowed coach-driven status transitions. Completion also happens automatically. */
const TRANSITIONS: Record<TournamentStatus, TournamentStatus[]> = {
  draft: ['open'],
  open: ['draft', 'ongoing'],
  ongoing: ['completed'],
  completed: [],
};

export function checkStatusTransition(
  from: TournamentStatus,
  to: TournamentStatus,
  participantCount: number,
): RuleViolation | null {
  if (from === to) return null;
  if (!TRANSITIONS[from].includes(to)) {
    return { code: 'BAD_TRANSITION', message: `Cannot move a tournament from ${from} to ${to}` };
  }
  if (to === 'ongoing' && participantCount < 2) {
    return { code: 'TOO_FEW_PLAYERS', message: 'At least 2 participants are needed to start' };
  }
  return null;
}

export const pairKey = (a: string, b: string) => (a < b ? `${a}:${b}` : `${b}:${a}`);

/** Round-robin: everyone plays everyone exactly once. */
export const totalRoundRobinGames = (players: number) => (players * (players - 1)) / 2;

export interface QueueEntry {
  userId: string;
  enqueuedAt: number;
}

/**
 * Pick an opponent for `me` from the waiting queue:
 *  1. never yourself, never someone you've already played (round-robin, one game per pair);
 *  2. prefer the closest score (standings-based pairing);
 *  3. then whoever has waited longest (FIFO).
 */
export function pickOpponent(
  me: string,
  waiting: QueueEntry[],
  playedPairs: Set<string>,
  points: Map<string, number>,
): QueueEntry | null {
  const myPoints = points.get(me) ?? 0;
  const eligible = waiting.filter((w) => w.userId !== me && !playedPairs.has(pairKey(me, w.userId)));
  if (eligible.length === 0) return null;
  return eligible.reduce((best, cand) => {
    const dBest = Math.abs((points.get(best.userId) ?? 0) - myPoints);
    const dCand = Math.abs((points.get(cand.userId) ?? 0) - myPoints);
    if (dCand !== dBest) return dCand < dBest ? cand : best;
    return cand.enqueuedAt < best.enqueuedAt ? cand : best;
  });
}

/** Give white to whoever has had it less often; on a tie, the player who waited longer. */
export function assignColors(
  waiter: string,
  newcomer: string,
  whiteCounts: Map<string, number>,
): { whiteId: string; blackId: string } {
  const w = whiteCounts.get(waiter) ?? 0;
  const n = whiteCounts.get(newcomer) ?? 0;
  return n < w ? { whiteId: newcomer, blackId: waiter } : { whiteId: waiter, blackId: newcomer };
}
