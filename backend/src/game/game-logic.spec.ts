import { Chess } from 'chess.js';
import {
  clockAt,
  detectGameEnd,
  gameHeaders,
  msUntilFlag,
  pgnHeaderValue,
  pgnMovetext,
  resultToPgn,
  switchClock,
  timeoutOutcome,
  tryMove,
} from './game-logic';

describe('tryMove — move/turn validation', () => {
  it('applies a legal move for the side to move', () => {
    const chess = new Chess();
    const r = tryMove(chess, 'white', { from: 'e2', to: 'e4' });
    expect(r).toMatchObject({ ok: true });
    expect(chess.turn()).toBe('b');
  });

  it('rejects moving out of turn and leaves the board alone', () => {
    const chess = new Chess();
    const fen = chess.fen();
    expect(tryMove(chess, 'black', { from: 'e7', to: 'e5' })).toEqual({ ok: false, error: 'NOT_YOUR_TURN' });
    expect(chess.fen()).toBe(fen);
  });

  it("rejects moving the opponent's pieces", () => {
    const chess = new Chess();
    expect(tryMove(chess, 'white', { from: 'e7', to: 'e5' })).toEqual({ ok: false, error: 'ILLEGAL_MOVE' });
  });

  it('rejects illegal moves', () => {
    const chess = new Chess();
    expect(tryMove(chess, 'white', { from: 'e2', to: 'e5' })).toEqual({ ok: false, error: 'ILLEGAL_MOVE' });
    expect(tryMove(chess, 'white', { from: 'z9', to: 'e4' })).toEqual({ ok: false, error: 'ILLEGAL_MOVE' });
  });

  it('rejects spectators', () => {
    expect(tryMove(new Chess(), null, { from: 'e2', to: 'e4' })).toEqual({ ok: false, error: 'NOT_A_PLAYER' });
  });

  it('rejects moves after the game is over', () => {
    const chess = new Chess();
    for (const [from, to] of [['f2', 'f3'], ['e7', 'e5'], ['g2', 'g4'], ['d8', 'h4']]) chess.move({ from, to });
    expect(tryMove(chess, 'white', { from: 'a2', to: 'a3' })).toEqual({ ok: false, error: 'GAME_OVER' });
  });

  it('auto-queens a promotion and honours an explicit piece', () => {
    const fen = '8/P7/8/8/8/8/8/k6K w - - 0 1';
    const a = new Chess(fen);
    const r = tryMove(a, 'white', { from: 'a7', to: 'a8' });
    expect(r.ok && r.move.san).toBe('a8=Q+'); // the new queen checks the king on a1
    const b = new Chess(fen);
    const r2 = tryMove(b, 'white', { from: 'a7', to: 'a8', promotion: 'n' });
    expect(r2.ok && r2.move.san).toBe('a8=N');
  });
});

describe('detectGameEnd', () => {
  it('returns null mid-game', () => expect(detectGameEnd(new Chess())).toBeNull());

  it("detects fool's mate as a black win by checkmate", () => {
    const chess = new Chess();
    for (const san of ['f3', 'e5', 'g4', 'Qh4#']) chess.move(san);
    expect(detectGameEnd(chess)).toEqual({ result: 'black', termination: 'checkmate' });
  });

  it('detects stalemate', () => {
    expect(detectGameEnd(new Chess('7k/5Q2/6K1/8/8/8/8/8 b - - 0 1'))).toEqual({ result: 'draw', termination: 'stalemate' });
  });

  it('detects insufficient material', () => {
    expect(detectGameEnd(new Chess('8/8/8/8/8/8/8/k6K w - - 0 1'))).toEqual({
      result: 'draw',
      termination: 'insufficient_material',
    });
  });

  it('detects threefold repetition', () => {
    const chess = new Chess();
    for (let i = 0; i < 2; i++) for (const san of ['Nf3', 'Nf6', 'Ng1', 'Ng8']) chess.move(san);
    expect(detectGameEnd(chess)).toEqual({ result: 'draw', termination: 'threefold_repetition' });
  });

  it('detects the fifty-move rule', () => {
    expect(detectGameEnd(new Chess('4k3/8/8/8/8/8/R7/4K3 w - - 100 80'))).toEqual({
      result: 'draw',
      termination: 'fifty_move_rule',
    });
  });
});

describe('clock', () => {
  const start = { whiteMs: 60_000, blackMs: 60_000, turnStartedAt: 1_000, turn: 'white' as const };

  it('only runs the clock of the side to move', () => {
    expect(clockAt(start, 11_000)).toEqual({ whiteMs: 50_000, blackMs: 60_000 });
    expect(msUntilFlag(start, 11_000)).toBe(50_000);
  });

  it('never goes negative', () => expect(clockAt(start, 999_999).whiteMs).toBe(0));

  it('charges the mover, adds increment and passes the turn', () => {
    const r = switchClock(start, 11_000, 3_000);
    expect(r).toEqual({ clock: { whiteMs: 53_000, blackMs: 60_000, turnStartedAt: 11_000, turn: 'black' } });
  });

  it("adds the increment to black's clock when black moves", () => {
    const blackToMove = { ...start, turn: 'black' as const };
    expect(switchClock(blackToMove, 6_000, 2_000)).toEqual({
      clock: { whiteMs: 60_000, blackMs: 57_000, turnStartedAt: 6_000, turn: 'white' },
    });
  });

  it('does not add time when now is before turnStartedAt', () => {
    expect(clockAt(start, 0)).toEqual({ whiteMs: 60_000, blackMs: 60_000 });
  });

  it('flags black exactly when the clock reaches zero', () => {
    const blackToMove = { ...start, turn: 'black' as const };
    expect(msUntilFlag(blackToMove, 61_000)).toBe(0);
    expect(switchClock(blackToMove, 61_000, 5_000)).toEqual({ flagged: 'black' });
  });

  it('flags a move that arrives after time ran out', () => {
    expect(switchClock(start, 61_000, 0)).toEqual({ flagged: 'white' });
  });

  it('scores a flag as a loss, or a draw if the opponent has a lone king', () => {
    expect(timeoutOutcome(new Chess(), 'white')).toEqual({ result: 'black', termination: 'timeout' });
    expect(timeoutOutcome(new Chess('8/8/8/8/8/8/Q7/k6K w - - 0 1'), 'white')).toEqual({
      result: 'draw',
      termination: 'timeout',
    });
  });

  it('scores a black flag as a white win, or a draw if white has a lone king', () => {
    expect(timeoutOutcome(new Chess(), 'black')).toEqual({ result: 'white', termination: 'timeout' });
    expect(timeoutOutcome(new Chess('8/8/8/8/8/8/q7/K6k w - - 0 1'), 'black')).toEqual({
      result: 'draw',
      termination: 'timeout',
    });
  });
});

describe('timeoutOutcome — can the other side still mate?', () => {
  // White flags; black keeps the listed material (plus a white pawn so the position isn't a dead draw).
  const blackHas = (pieces: string) => new Chess(`k7/${pieces}/8/8/8/8/P7/K7 w - - 0 1`);

  it('is a draw when the opponent has only a king and one knight or bishop', () => {
    expect(timeoutOutcome(blackHas('n7'), 'white')).toEqual({ result: 'draw', termination: 'timeout' });
    expect(timeoutOutcome(blackHas('b7'), 'white')).toEqual({ result: 'draw', termination: 'timeout' });
  });

  it('is a win when the opponent has a pawn, rook, queen or two minor pieces', () => {
    expect(timeoutOutcome(blackHas('p7'), 'white').result).toBe('black');
    expect(timeoutOutcome(blackHas('r7'), 'white').result).toBe('black');
    expect(timeoutOutcome(blackHas('q7'), 'white').result).toBe('black');
    expect(timeoutOutcome(blackHas('nn6'), 'white').result).toBe('black');
    expect(timeoutOutcome(blackHas('bn6'), 'white').result).toBe('black');
  });

  it('applies the same rule when black flags', () => {
    expect(timeoutOutcome(new Chess('k7/p7/8/8/8/8/8/K6B b - - 0 1'), 'black').result).toBe('draw');
    expect(timeoutOutcome(new Chess('k7/p7/8/8/8/8/8/K5BB b - - 0 1'), 'black').result).toBe('white');
  });
});

describe('PGN helpers', () => {
  it('neutralises characters that break PGN tags', () => {
    expect(pgnHeaderValue('Cup "Final"')).toBe("Cup 'Final'");
    expect(pgnHeaderValue('back\\slash\\')).toBe('back/slash/');
    expect(pgnHeaderValue('two\nlines\t ')).toBe('two lines');
    expect(pgnHeaderValue('Plain [name]')).toBe('Plain [name]');
  });

  it('produces a PGN chess.js can load back', () => {
    const chess = new Chess();
    chess.setHeader('Event', pgnHeaderValue('Spring "Open" \\'));
    chess.move('e4');
    const copy = new Chess();
    expect(() => copy.loadPgn(chess.pgn())).not.toThrow();
    expect(copy.getHeaders().Event).toBe("Spring 'Open' /");
  });

  it('builds sanitised starting tags', () => {
    const h = gameHeaders({
      event: 'Cup "Final"',
      white: 'Ann "The Rook"',
      black: 'Bob',
      date: new Date('2026-03-04T12:00:00Z'),
      baseMinutes: 5,
      incrementSeconds: 3,
    });
    expect(h).toEqual({
      Event: "Cup 'Final'",
      Site: 'Kingdom of Chess',
      Date: '2026.03.04',
      White: "Ann 'The Rook'",
      Black: 'Bob',
      TimeControl: '300+3',
    });
  });

  it('recovers the moves from a PGN whose tags are corrupt', () => {
    const bad = '[Event "Cup "Final""]\n[White "A"]\n\n1. e4 e5 2. Nf3 *';
    expect(() => new Chess().loadPgn(bad)).toThrow();
    const chess = new Chess();
    chess.loadPgn(pgnMovetext(bad));
    expect(chess.history()).toEqual(['e4', 'e5', 'Nf3']);
  });
});

describe('resultToPgn', () => {
  it('maps results to PGN result tags', () => {
    expect(resultToPgn('white')).toBe('1-0');
    expect(resultToPgn('black')).toBe('0-1');
    expect(resultToPgn('draw')).toBe('1/2-1/2');
    expect(resultToPgn(null)).toBe('*');
  });
});
