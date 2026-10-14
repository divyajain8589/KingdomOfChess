import type { MatchResult } from '../db/schema';

/** Pure leaderboard maths. Win = 1, draw = ½, loss = 0. */

export interface StandingPlayer {
  id: string;
  name: string;
}

export interface ScoredGame {
  whiteId: string;
  blackId: string;
  result: MatchResult;
}

export interface Standing {
  rank: number;
  userId: string;
  name: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  points: number;
  /** Sonneborn–Berger: sum of beaten opponents' points + half of drawn opponents' points. */
  sonnebornBerger: number;
}

export function pointsFor(result: MatchResult, color: 'white' | 'black'): number {
  if (result === 'draw') return 0.5;
  return result === color ? 1 : 0;
}

/**
 * Sort order: points ↓, Sonneborn–Berger ↓, wins ↓, then name (for a stable display only).
 * Players level on all three tiebreaks share a rank ("1, 1, 3" style).
 */
export function computeStandings(players: StandingPlayer[], games: ScoredGame[]): Standing[] {
  const rows = new Map<string, Standing>();
  for (const p of players) {
    rows.set(p.id, {
      rank: 0,
      userId: p.id,
      name: p.name,
      played: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      points: 0,
      sonnebornBerger: 0,
    });
  }

  // Games involving someone no longer in the player list are ignored.
  const counted = games.filter((g) => rows.has(g.whiteId) && rows.has(g.blackId));

  for (const g of counted) {
    for (const color of ['white', 'black'] as const) {
      const row = rows.get(color === 'white' ? g.whiteId : g.blackId)!;
      const pts = pointsFor(g.result, color);
      row.played += 1;
      row.points += pts;
      if (pts === 1) row.wins += 1;
      else if (pts === 0.5) row.draws += 1;
      else row.losses += 1;
    }
  }

  // Second pass: SB needs every opponent's final score.
  for (const g of counted) {
    for (const color of ['white', 'black'] as const) {
      const me = rows.get(color === 'white' ? g.whiteId : g.blackId)!;
      const opp = rows.get(color === 'white' ? g.blackId : g.whiteId)!;
      me.sonnebornBerger += pointsFor(g.result, color) * opp.points;
    }
  }

  const sorted = [...rows.values()].sort(
    (a, b) =>
      b.points - a.points ||
      b.sonnebornBerger - a.sonnebornBerger ||
      b.wins - a.wins ||
      a.name.localeCompare(b.name),
  );

  sorted.forEach((row, i) => {
    const prev = sorted[i - 1];
    const tied =
      prev &&
      prev.points === row.points &&
      prev.sonnebornBerger === row.sonnebornBerger &&
      prev.wins === row.wins;
    row.rank = tied ? prev.rank : i + 1;
  });

  return sorted;
}

/** The winner is the sole leader; if the top spot is shared on every tiebreak there is none. */
export function pickWinner(standings: Standing[]): Standing | null {
  if (standings.length === 0 || standings[0].played === 0) return null;
  const leaders = standings.filter((s) => s.rank === 1);
  return leaders.length === 1 ? leaders[0] : null;
}
