import {
  assignColors,
  checkCanJoin,
  checkCanLeave,
  checkCanQueue,
  checkStatusTransition,
  pairKey,
  pickOpponent,
  totalRoundRobinGames,
} from './tournament-rules';

describe('join rules', () => {
  it('lets a student join an open tournament', () => {
    expect(checkCanJoin({ role: 'student', status: 'open', alreadyParticipant: false })).toBeNull();
  });

  it.each(['draft', 'ongoing', 'completed'] as const)('rejects joining a %s tournament', (status) => {
    expect(checkCanJoin({ role: 'student', status, alreadyParticipant: false })?.code).toBe('NOT_OPEN');
  });

  it('rejects joining twice', () => {
    expect(checkCanJoin({ role: 'student', status: 'open', alreadyParticipant: true })?.code).toBe('ALREADY_JOINED');
  });

  it('rejects coaches', () => {
    expect(checkCanJoin({ role: 'coach', status: 'open', alreadyParticipant: false })?.code).toBe('ROLE');
  });

  it('checks role before membership and status', () => {
    expect(checkCanJoin({ role: 'coach', status: 'completed', alreadyParticipant: true })?.code).toBe('ROLE');
    expect(checkCanJoin({ role: 'student', status: 'ongoing', alreadyParticipant: true })?.code).toBe('ALREADY_JOINED');
    expect(checkCanLeave({ status: 'ongoing', isParticipant: false })?.code).toBe('NOT_JOINED');
  });

  it('only allows withdrawing while open', () => {
    expect(checkCanLeave({ status: 'open', isParticipant: true })).toBeNull();
    expect(checkCanLeave({ status: 'ongoing', isParticipant: true })?.code).toBe('LOCKED');
    expect(checkCanLeave({ status: 'open', isParticipant: false })?.code).toBe('NOT_JOINED');
  });
});

describe('queue rules', () => {
  const ok = { status: 'ongoing' as const, isParticipant: true, activeMatchId: null, opponentsRemaining: 3 };

  it('allows an eligible participant', () => expect(checkCanQueue(ok)).toBeNull());
  it('requires participation', () => expect(checkCanQueue({ ...ok, isParticipant: false })?.code).toBe('NOT_JOINED'));
  it('requires an ongoing tournament', () => expect(checkCanQueue({ ...ok, status: 'open' })?.code).toBe('NOT_ONGOING'));
  it('blocks players already in a match (no double booking)', () =>
    expect(checkCanQueue({ ...ok, activeMatchId: 'm1' })?.code).toBe('IN_MATCH'));
  it('blocks players who have played everyone', () =>
    expect(checkCanQueue({ ...ok, opponentsRemaining: 0 })?.code).toBe('ALL_PLAYED'));
  it('reports the first failing rule: participation, then status, then active match, then opponents', () => {
    const allBad = { status: 'completed' as const, isParticipant: false, activeMatchId: 'm1', opponentsRemaining: 0 };
    expect(checkCanQueue(allBad)?.code).toBe('NOT_JOINED');
    expect(checkCanQueue({ ...allBad, isParticipant: true })?.code).toBe('NOT_ONGOING');
    expect(checkCanQueue({ ...allBad, isParticipant: true, status: 'ongoing' })?.code).toBe('IN_MATCH');
  });
});

describe('status transitions', () => {
  it('follows draft → open → ongoing → completed', () => {
    expect(checkStatusTransition('draft', 'open', 0)).toBeNull();
    expect(checkStatusTransition('open', 'ongoing', 2)).toBeNull();
    expect(checkStatusTransition('ongoing', 'completed', 2)).toBeNull();
  });
  it('allows reopening a draft', () => expect(checkStatusTransition('open', 'draft', 0)).toBeNull());
  it('rejects skipping or going backwards', () => {
    expect(checkStatusTransition('draft', 'ongoing', 4)?.code).toBe('BAD_TRANSITION');
    expect(checkStatusTransition('completed', 'ongoing', 4)?.code).toBe('BAD_TRANSITION');
  });
  it('treats a same-status update as a no-op and rejects ongoing → open', () => {
    expect(checkStatusTransition('completed', 'completed', 0)).toBeNull();
    expect(checkStatusTransition('ongoing', 'open', 4)?.code).toBe('BAD_TRANSITION');
  });
  it('needs two players to start', () => expect(checkStatusTransition('open', 'ongoing', 1)?.code).toBe('TOO_FEW_PLAYERS'));
});

describe('pickOpponent', () => {
  const q = (userId: string, enqueuedAt: number) => ({ userId, enqueuedAt });

  it('returns null with nobody else waiting', () => {
    expect(pickOpponent('a', [q('a', 1)], new Set(), new Map())).toBeNull();
  });

  it('falls back to FIFO when scores are equal', () => {
    expect(pickOpponent('a', [q('c', 5), q('b', 2)], new Set(), new Map())?.userId).toBe('b');
  });

  it('never re-pairs players who already met', () => {
    expect(pickOpponent('a', [q('b', 1), q('c', 2)], new Set([pairKey('a', 'b')]), new Map())?.userId).toBe('c');
    expect(pickOpponent('a', [q('b', 1)], new Set([pairKey('b', 'a')]), new Map())).toBeNull();
  });

  it('prefers the closest score over waiting time', () => {
    const points = new Map([
      ['a', 2],
      ['b', 0],
      ['c', 2],
    ]);
    expect(pickOpponent('a', [q('b', 1), q('c', 9)], new Set(), points)?.userId).toBe('c');
  });

  it('measures closeness in both directions, then uses FIFO', () => {
    const points = new Map([
      ['a', 1],
      ['b', 2],
      ['c', 0],
    ]);
    expect(pickOpponent('a', [q('b', 5), q('c', 3)], new Set(), points)?.userId).toBe('c');
    expect(pickOpponent('a', [q('b', 3), q('c', 5)], new Set(), points)?.userId).toBe('b');
  });
});

describe('assignColors', () => {
  it('gives white to whoever has had it less', () => {
    expect(assignColors('a', 'b', new Map([['a', 2], ['b', 1]]))).toEqual({ whiteId: 'b', blackId: 'a' });
  });
  it('gives white to the longer waiter on a tie', () => {
    expect(assignColors('a', 'b', new Map())).toEqual({ whiteId: 'a', blackId: 'b' });
  });
});

it('counts round-robin games', () => {
  expect(totalRoundRobinGames(4)).toBe(6);
  expect(totalRoundRobinGames(2)).toBe(1);
});
