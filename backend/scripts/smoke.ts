/**
 * End-to-end smoke test against a running API (npm run smoke). Uses the seeded "Saturday Blitz
 * Arena": two students log in, queue, get auto-paired, play fool's mate over Socket.IO, and the
 * result shows up on the leaderboard. Also checks auth/role enforcement on REST and sockets.
 */
import { io, Socket } from 'socket.io-client';

const API = process.env.API_URL ?? 'http://localhost:4000';

type Ack<T = any> = { ok: true; data: T } | { ok: false; error: { code: string; message: string } };

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(`✗ ${msg}`);
  console.log(`✓ ${msg}`);
}

async function login(email: string) {
  const res = await fetch(`${API}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password: 'password123' }),
  });
  const cookie = res.headers.get('set-cookie')!.split(';')[0];
  return { cookie, me: (await res.json()).data };
}

const get = (path: string, cookie?: string) =>
  fetch(`${API}/api/v1${path}`, { headers: cookie ? { cookie } : {} }).then(async (r) => ({ status: r.status, body: await r.json() }));

function connect(cookie: string): Promise<Socket> {
  return new Promise((resolve, reject) => {
    const s = io(API, { extraHeaders: { cookie }, transports: ['websocket'] });
    s.on('connect', () => resolve(s));
    s.on('connect_error', reject);
  });
}

const emit = <T = any>(s: Socket, ev: string, payload: unknown) =>
  new Promise<Ack<T>>((resolve) => s.emit(ev, payload, resolve));

async function main() {
  // --- auth & roles
  assert((await get('/me')).status === 401, 'GET /me without a cookie → 401');
  const coach = await login('coach@koc.test');
  const a = await login('aarav@koc.test');
  const b = await login('diya@koc.test');
  assert((await get('/me', a.cookie)).body.data.role === 'student', 'GET /me returns the logged-in student');
  assert((await get('/students', a.cookie)).status === 403, 'student → coach-only endpoint → 403');
  assert((await get('/me/schedule', coach.cookie)).status === 403, 'coach → student-only endpoint → 403');
  const bad = await fetch(`${API}/api/v1/tournaments`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', cookie: coach.cookie },
    body: JSON.stringify({ name: 'x', timeControlMinutes: 0 }),
  });
  assert(bad.status === 400 && (await bad.json()).error.code === 'VALIDATION_ERROR', 'invalid DTO → 400 VALIDATION_ERROR');

  let rejected = false;
  await connect('koc_token=forged').catch(() => (rejected = true));
  assert(rejected, 'socket handshake without a valid session is rejected');

  // --- find the arena and two players who haven't met yet
  const list = await get('/tournaments?status=ongoing', a.cookie);
  const arena = list.body.data.find((t: any) => t.name === 'Saturday Blitz Arena');
  assert(arena, 'found the seeded ongoing tournament');

  const sa = await connect(a.cookie);
  const sb = await connect(b.cookie);
  const sc = await connect(coach.cookie);
  const found = new Promise<any>((r) => sa.once('match:found', r));

  const q1 = await emit(sa, 'queue:join', { tournamentId: arena.id });
  if (!q1.ok) {
    console.log(`(skipping game: ${q1.error.message} — reseed to replay)`);
    process.exit(0);
  }
  assert(q1.data.queue.queued && !q1.data.match, 'first player waits in the queue');
  const q2 = await emit(sb, 'queue:join', { tournamentId: arena.id });
  assert(q2.ok && q2.data.match, 'second player is auto-paired immediately');
  const { matchId } = await found;
  assert(matchId === (q2 as any).data.match.matchId, 'waiting player receives match:found push');

  const again = await emit(sa, 'queue:join', { tournamentId: arena.id });
  assert(!again.ok && again.error.code === 'IN_MATCH', 'a player in a game cannot queue again (no double booking)');

  // --- room access
  const outsider = await login('kabir@koc.test');
  const so = await connect(outsider.cookie);
  const peek = await emit(so, 'match:join', { matchId });
  assert(!peek.ok && peek.error.code === 'FORBIDDEN', 'non-participant cannot join the match room');
  const spectate = await emit(sc, 'match:join', { matchId });
  assert(spectate.ok, 'coach can spectate');

  const ja = await emit(sa, 'match:join', { matchId });
  const jb = await emit(sb, 'match:join', { matchId });
  assert(ja.ok && jb.ok, 'both players join the match room');
  const state = (ja as any).data;
  const white = state.white.id === a.me.id ? sa : sb;
  const black = white === sa ? sb : sa;

  // --- turn & legality validated on the server
  const wrongTurn = await emit(black, 'match:move', { matchId, from: 'e7', to: 'e5' });
  assert(!wrongTurn.ok && wrongTurn.error.code === 'NOT_YOUR_TURN', 'moving out of turn is rejected');
  const illegal = await emit(white, 'match:move', { matchId, from: 'e2', to: 'e5' });
  assert(!illegal.ok && illegal.error.code === 'ILLEGAL_MOVE', 'illegal move is rejected');
  const spectatorMove = await emit(sc, 'match:move', { matchId, from: 'e2', to: 'e4' });
  assert(!spectatorMove.ok, 'spectator cannot move');

  // --- the opponent sees each move
  const seen = new Promise<any>((r) => black.once('match:state', r));
  await emit(white, 'match:move', { matchId, from: 'f2', to: 'f3' });
  assert((await seen).moves[0] === 'f3', "white's move is pushed to black's board");
  await emit(black, 'match:move', { matchId, from: 'e7', to: 'e5' });
  await emit(white, 'match:move', { matchId, from: 'g2', to: 'g4' });
  const end = await emit(black, 'match:move', { matchId, from: 'd8', to: 'h4' });
  assert(end.ok && end.data.status === 'completed' && end.data.termination === 'checkmate', 'checkmate ends the game');
  assert(end.ok && end.data.pgn.includes('0-1'), 'PGN carries the result');

  await new Promise((r) => setTimeout(r, 300)); // result write is async
  const board = await get(`/tournaments/${arena.id}/leaderboard`, a.cookie);
  const blackId = state.white.id === a.me.id ? b.me.id : a.me.id;
  const row = board.body.data.standings.find((s: any) => s.userId === blackId);
  assert(row.points >= 1 && row.rank >= 1, 'winner has points on the leaderboard');
  const rematch = await emit(sa, 'queue:join', { tournamentId: arena.id });
  assert(rematch.ok, 'player can re-queue after the game');
  await emit(sa, 'queue:leave', { tournamentId: arena.id });

  const stored = await get(`/matches/${matchId}`, a.cookie);
  assert(stored.body.data.pgn.includes('Qh4#'), 'PGN is persisted');

  for (const s of [sa, sb, sc, so]) s.close();
  console.log('\nAll smoke checks passed');
}

main().catch((e) => {
  console.error(e.message ?? e);
  process.exit(1);
});
