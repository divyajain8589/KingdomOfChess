import { computeStandings, pickWinner, pointsFor } from './standings';

const players = [
  { id: 'a', name: 'Aarav' },
  { id: 'b', name: 'Bhavya' },
  { id: 'c', name: 'Chirag' },
  { id: 'd', name: 'Diya' },
];

describe('pointsFor', () => {
  it('scores win = 1, draw = ½, loss = 0', () => {
    expect(pointsFor('white', 'white')).toBe(1);
    expect(pointsFor('white', 'black')).toBe(0);
    expect(pointsFor('black', 'black')).toBe(1);
    expect(pointsFor('draw', 'white')).toBe(0.5);
    expect(pointsFor('draw', 'black')).toBe(0.5);
  });
});

describe('computeStandings', () => {
  it('lists every participant with zero points before any game', () => {
    const s = computeStandings(players, []);
    expect(s).toHaveLength(4);
    expect(s.every((r) => r.points === 0 && r.played === 0 && r.rank === 1)).toBe(true);
  });

  it('turns results into points, W/D/L and sorts by points', () => {
    const s = computeStandings(players, [
      { whiteId: 'a', blackId: 'b', result: 'white' },
      { whiteId: 'c', blackId: 'a', result: 'draw' },
      { whiteId: 'd', blackId: 'b', result: 'black' },
    ]);
    const a = s.find((r) => r.userId === 'a')!;
    expect(a).toMatchObject({ points: 1.5, wins: 1, draws: 1, losses: 0, played: 2 });
    const b = s.find((r) => r.userId === 'b')!;
    expect(b).toMatchObject({ points: 1, wins: 1, losses: 1, played: 2 });
    expect(s.map((r) => r.userId)).toEqual(['a', 'b', 'c', 'd']);
    expect(s[0].rank).toBe(1);
  });

  it('breaks ties on points with Sonneborn–Berger', () => {
    // a and b both on 1 point; a beat c (1 pt), b beat d (0 pts) → a has the higher SB.
    const s = computeStandings(players, [
      { whiteId: 'a', blackId: 'c', result: 'white' },
      { whiteId: 'b', blackId: 'd', result: 'white' },
      { whiteId: 'c', blackId: 'd', result: 'white' },
    ]);
    const a = s.find((r) => r.userId === 'a')!;
    const b = s.find((r) => r.userId === 'b')!;
    expect(a.sonnebornBerger).toBe(1);
    expect(b.sonnebornBerger).toBe(0);
    expect(a.rank).toBeLessThan(b.rank);
  });

  it('shares a rank when every tiebreak is level', () => {
    const s = computeStandings(players.slice(0, 2), [{ whiteId: 'a', blackId: 'b', result: 'draw' }]);
    expect(s.map((r) => r.rank)).toEqual([1, 1]);
    expect(pickWinner(s)).toBeNull();
  });

  it('counts half of a drawn opponent\'s score in Sonneborn–Berger', () => {
    // a: ½+½ = 1, b: ½+1 = 1.5, c: ½, d: 0.
    const s = computeStandings(players, [
      { whiteId: 'a', blackId: 'b', result: 'draw' },
      { whiteId: 'c', blackId: 'a', result: 'draw' },
      { whiteId: 'd', blackId: 'b', result: 'black' },
    ]);
    const sb = Object.fromEntries(s.map((r) => [r.userId, r.sonnebornBerger]));
    expect(sb).toEqual({ a: 1, b: 0.5, c: 0.5, d: 0 }); // a = ½·1.5 + ½·0.5; b = ½·1 + 1·0
  });

  it('falls back to wins when points and Sonneborn–Berger are level', () => {
    const ps = ['a', 'b', 'c', 'd', 'e', 'f', 'g'].map((id) => ({ id, name: id.toUpperCase() }));
    const s = computeStandings(ps, [
      { whiteId: 'a', blackId: 'c', result: 'white' },
      { whiteId: 'd', blackId: 'a', result: 'white' },
      { whiteId: 'b', blackId: 'e', result: 'draw' },
      { whiteId: 'b', blackId: 'f', result: 'draw' },
      { whiteId: 'c', blackId: 'g', result: 'draw' },
    ]);
    const a = s.find((r) => r.userId === 'a')!;
    const b = s.find((r) => r.userId === 'b')!;
    expect([a.points, a.sonnebornBerger, a.wins]).toEqual([1, 0.5, 1]);
    expect([b.points, b.sonnebornBerger, b.wins]).toEqual([1, 0.5, 0]);
    expect(s.slice(0, 3).map((r) => [r.userId, r.rank])).toEqual([
      ['d', 1],
      ['a', 2],
      ['b', 3],
    ]);
  });

  it('shares rank 1 among three level players and skips to 4 for the next', () => {
    // Cycle: a beats b, b beats c, c beats a → 1 pt, SB 1, 1 win each. d has not played.
    const s = computeStandings(players, [
      { whiteId: 'a', blackId: 'b', result: 'white' },
      { whiteId: 'b', blackId: 'c', result: 'white' },
      { whiteId: 'c', blackId: 'a', result: 'white' },
    ]);
    expect(s.map((r) => [r.userId, r.rank])).toEqual([
      ['a', 1],
      ['b', 1],
      ['c', 1],
      ['d', 4],
    ]);
    expect(pickWinner(s)).toBeNull();
  });

  it('ignores games with players outside the list', () => {
    const s = computeStandings(players.slice(0, 2), [{ whiteId: 'a', blackId: 'zzz', result: 'white' }]);
    expect(s.every((r) => r.played === 0)).toBe(true);
  });
});

describe('pickWinner', () => {
  it('declares the sole leader', () => {
    const s = computeStandings(players, [
      { whiteId: 'a', blackId: 'b', result: 'white' },
      { whiteId: 'c', blackId: 'd', result: 'draw' },
    ]);
    expect(pickWinner(s)?.userId).toBe('a');
  });

  it('has no winner before any games are played', () => {
    expect(pickWinner(computeStandings(players, []))).toBeNull();
  });
});
