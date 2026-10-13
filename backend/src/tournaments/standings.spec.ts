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
