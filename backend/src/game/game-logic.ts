import { Chess, Move } from 'chess.js';
import type { MatchResult, MatchTermination } from '../db/schema';

/**
 * Pure, deterministic game rules on top of chess.js. No I/O, no timers — the caller passes
 * `now` in, which keeps everything here unit-testable.
 */

export type Color = 'white' | 'black';

export interface MoveInput {
  from: string;
  to: string;
  promotion?: string;
}

export interface ClockState {
  whiteMs: number;
  blackMs: number;
  /** Epoch ms when the side to move started thinking. */
  turnStartedAt: number;
  turn: Color;
}

export interface GameOutcome {
  result: MatchResult;
  termination: MatchTermination;
}

export type MoveError = 'NOT_A_PLAYER' | 'NOT_YOUR_TURN' | 'ILLEGAL_MOVE' | 'GAME_OVER';

export const toColor = (c: 'w' | 'b'): Color => (c === 'w' ? 'white' : 'black');
export const opposite = (c: Color): Color => (c === 'white' ? 'black' : 'white');

/** Remaining time for both sides at `now`; only the side to move is ticking. Never negative. */
export function clockAt(clock: ClockState, now: number): { whiteMs: number; blackMs: number } {
  const elapsed = Math.max(0, now - clock.turnStartedAt);
  return {
    whiteMs: clock.turn === 'white' ? Math.max(0, clock.whiteMs - elapsed) : clock.whiteMs,
    blackMs: clock.turn === 'black' ? Math.max(0, clock.blackMs - elapsed) : clock.blackMs,
  };
}

/** Milliseconds until the side to move flags, measured from `now`. */
export function msUntilFlag(clock: ClockState, now: number): number {
  const t = clockAt(clock, now);
  return clock.turn === 'white' ? t.whiteMs : t.blackMs;
}

/**
 * Charge the mover for their thinking time, add the increment and hand the clock to the
 * opponent. Returns `flagged` instead if the mover's time had already run out — a move that
 * arrives after the flag fell doesn't count.
 */
export function switchClock(
  clock: ClockState,
  now: number,
  incrementMs: number,
): { flagged: Color } | { clock: ClockState } {
  const t = clockAt(clock, now);
  const moverLeft = clock.turn === 'white' ? t.whiteMs : t.blackMs;
  if (moverLeft <= 0) return { flagged: clock.turn };
  return {
    clock: {
      whiteMs: clock.turn === 'white' ? t.whiteMs + incrementMs : t.whiteMs,
      blackMs: clock.turn === 'black' ? t.blackMs + incrementMs : t.blackMs,
      turnStartedAt: now,
      turn: opposite(clock.turn),
    },
  };
}

/**
 * Validate a move for `playerColor` (null = not a player in this game) and apply it to `chess`
 * if legal. On error the board is left untouched.
 */
export function tryMove(
  chess: Chess,
  playerColor: Color | null,
  input: MoveInput,
): { ok: true; move: Move } | { ok: false; error: MoveError } {
  if (!playerColor) return { ok: false, error: 'NOT_A_PLAYER' };
  if (chess.isGameOver()) return { ok: false, error: 'GAME_OVER' };
  if (toColor(chess.turn()) !== playerColor) return { ok: false, error: 'NOT_YOUR_TURN' };
  try {
    // chess.js throws on illegal / malformed moves.
    const move = chess.move({ from: input.from, to: input.to, promotion: input.promotion ?? 'q' });
    return { ok: true, move };
  } catch {
    return { ok: false, error: 'ILLEGAL_MOVE' };
  }
}

/** Board-derived game end (not resignation/timeout/agreement, which are events, not positions). */
export function detectGameEnd(chess: Chess): GameOutcome | null {
  if (chess.isCheckmate()) {
    // The side to move has been mated.
    return { result: chess.turn() === 'w' ? 'black' : 'white', termination: 'checkmate' };
  }
  if (chess.isStalemate()) return { result: 'draw', termination: 'stalemate' };
  if (chess.isInsufficientMaterial()) return { result: 'draw', termination: 'insufficient_material' };
  if (chess.isThreefoldRepetition()) return { result: 'draw', termination: 'threefold_repetition' };
  if (chess.isDrawByFiftyMoves()) return { result: 'draw', termination: 'fifty_move_rule' };
  return null;
}

/**
 * Loss on time — unless the side that didn't flag can't possibly mate, which FIDE scores as a
 * draw. Approximation of "no legal sequence leads to mate": the winner has no pawns, rooks or
 * queens and at most one minor piece (lone king, K+N, K+B).
 */
export function timeoutOutcome(chess: Chess, flagged: Color): GameOutcome {
  const winner = opposite(flagged);
  const winnerCode = winner === 'white' ? 'w' : 'b';
  const pieces = chess
    .board()
    .flat()
    .filter((sq) => sq && sq.color === winnerCode && sq.type !== 'k')
    .map((sq) => sq!.type);
  const hasMajorOrPawn = pieces.some((t) => t === 'p' || t === 'r' || t === 'q');
  if (!hasMajorOrPawn && pieces.length <= 1) return { result: 'draw', termination: 'timeout' };
  return { result: winner, termination: 'timeout' };
}

/**
 * Make a value safe for a PGN tag. chess.js doesn't escape tag values, so a `"` (or a trailing
 * `\`) in a tournament or player name would produce a PGN it can't load back.
 */
export const pgnHeaderValue = (value: string): string =>
  value
    .replace(/"/g, "'")
    .replace(/\\/g, '/')
    .replace(/[\u0000-\u001f\u007f]+/g, ' ')
    .trim();

/** The PGN tags every game starts with, already sanitised. */
export function gameHeaders(info: {
  event: string;
  white: string;
  black: string;
  date: Date;
  baseMinutes: number;
  incrementSeconds: number;
}): Record<string, string> {
  return {
    Event: pgnHeaderValue(info.event),
    Site: 'Kingdom of Chess',
    Date: info.date.toISOString().slice(0, 10).replace(/-/g, '.'),
    White: pgnHeaderValue(info.white),
    Black: pgnHeaderValue(info.black),
    TimeControl: `${info.baseMinutes * 60}+${info.incrementSeconds}`,
  };
}

/** The movetext of a PGN with its tag pairs dropped — a fallback when the tags themselves are corrupt. */
export const pgnMovetext = (pgn: string): string =>
  pgn
    .split(/\r?\n/)
    .filter((line) => !line.trimStart().startsWith('['))
    .join('\n')
    .trim();

export const resultToPgn = (result: MatchResult | null): string =>
  result === 'white' ? '1-0' : result === 'black' ? '0-1' : result === 'draw' ? '1/2-1/2' : '*';
