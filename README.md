# Kingdom of Chess — Live Tournaments

A tournament module with live 1-on-1 play. Coaches create and run tournaments. Students join, get auto-matched, and play on a real-time board with a shared, server-run clock. Results feed a live leaderboard.

**Stack:** NestJS 11 · Drizzle ORM + PostgreSQL · Socket.IO · class-validator — Next.js 16 (App Router) · React 19 · Tailwind v4 + shadcn/ui · TanStack Query · chess.js · react-chessboard

```
backend/    NestJS API + Socket.IO gateway, Drizzle schema & migrations, seed, unit tests, e2e smoke script
frontend/   Next.js app
docker-compose.yml
```

---

## 1. Quick start (Docker, one command)

```bash
docker compose up --build
```

- Web app: http://localhost:3000
- API: http://localhost:4000/api/v1 (health check: `/api/v1/health`)

Postgres runs in a container. When the API container starts, it applies migrations and runs the seed, which is idempotent, before serving. To use your own JWT secret, run `JWT_SECRET=... docker compose up --build`.

## 2. Local setup (without Docker)

Requirements: Node 20.12+ (developed on Node 24) and PostgreSQL 14+. Any Postgres works: local, Docker, Neon or Supabase.

```bash
# 0. A database
createdb kingdom_chess
# …or: docker run -d --name koc-db -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=kingdom_chess -p 5432:5432 postgres:16-alpine

# 1. API
cd backend
cp .env.example .env          # set DATABASE_URL and a JWT_SECRET (16+ chars)
npm install
npm run db:migrate            # applies drizzle/*.sql
npm run db:seed               # demo users + tournaments (idempotent; `npm run db:reset` wipes and re-seeds)
npm run start:dev             # http://localhost:4000

# 2. Web (second terminal)
cd frontend
cp .env.example .env.local    # NEXT_PUBLIC_API_URL=http://localhost:4000
npm install
npm run dev                   # http://localhost:3000
```

| Variable | Where | Meaning |
|---|---|---|
| `DATABASE_URL` | backend | Postgres connection string |
| `JWT_SECRET` | backend | Signs the session JWT (≥ 16 chars, validated at boot) |
| `JWT_EXPIRES_IN_SECONDS` | backend | Session length (default 86400) |
| `FRONTEND_URL` | backend | Browser origin of the web app, used for CORS on REST and Socket.IO |
| `COOKIE_SECURE` | backend | `true` behind HTTPS |
| `NEXT_PUBLIC_API_URL` | frontend | API URL as seen by the browser (built into the bundle at build time) |

### Seed accounts (password for all: `password123`)

| Role | Email |
|---|---|
| Coach | `coach@koc.test` |
| Student | `aarav@koc.test`, `diya@koc.test`, `kabir@koc.test`, `meera@koc.test` (registered in the ongoing arena) |
| Student | `rohan@koc.test` (registered in the open cup), `saanvi@koc.test` (not registered anywhere) |

Seeded tournaments:
- **Saturday Blitz Arena** (5+0, *ongoing*): ready to play now.
- **Junior Rapid Cup** (10+5, *open*): try joining it, then start it as the coach.
- **Monsoon Classical** (*draft*): only the coach can see it.

The login page has one-click buttons that fill in the demo accounts.

## 3. Play a match locally

1. Open two separate browser sessions, e.g. a normal window and an incognito window, or two different browsers. The session lives in a cookie, so two tabs in the *same* session would be the same user.
2. Sign in as `aarav@koc.test` in one and `diya@koc.test` in the other.
3. In both, open **Saturday Blitz Arena** and click **Find opponent**. The first player waits. When the second clicks, the server pairs them and **both browsers jump straight into the game**.
4. Play by dragging pieces or by clicking a piece and then its target square (legal targets are dotted). Moves, clocks, draw offers and the result appear on both boards instantly.
5. After the game, click **Find opponent** again for the next pairing, or open the leaderboard.
6. Optional: sign in as the coach in a third session. The tournament's **Matches** tab shows live games with a **Watch** button (spectator mode).

Everyone plays everyone once. When the last game of the round robin finishes, the tournament completes automatically and declares the winner.

Headless check of the same flow: with the API running, `cd backend && npm run smoke` drives two students over real sockets. It covers auth and role checks, queueing, auto-pairing, turn and legality rejection, room access, checkmate, the leaderboard update and the persisted PGN.

## 4. Tests

```bash
cd backend && npm test          # unit tests: scoring/standings, join/queue/status rules, pairing, move/turn validation, clocks, game-end detection
cd backend && npm run smoke     # e2e against a running API (see above)
cd frontend && npm run lint && npx tsc --noEmit
```

The rules are pure functions that take `now` as an argument and do no I/O: `game/game-logic.ts`, `tournaments/standings.ts` and `tournaments/tournament-rules.ts`. Services gather facts from the database and ask these functions for decisions, so the decisions can be tested directly.

---

## 5. API

All routes are under **`/api/v1`**: a global `api` prefix plus Nest URI versioning, with v1 as the default.

**Response envelope.** Every response uses one of two shapes:
```jsonc
{ "success": true,  "data": { ... } }
{ "success": false, "error": { "statusCode": 409, "code": "NOT_OPEN", "message": "This tournament is not open for registration", "details": ["..."] } }
```
`code` is stable and machine-readable. `details` lists class-validator messages on a 400 `VALIDATION_ERROR`. Status codes:

| Code | Meaning |
|---|---|
| 400 | Invalid input |
| 401 | No or expired session |
| 403 | Wrong role, or not your game |
| 404 | Not found. Students also get 404 for drafts, so they can't probe for them. |
| 409 | Rule conflict: wrong status, already joined, live games |
| 422 | Illegal move |

**Auth.** `POST /auth/login` sets an **httpOnly, SameSite=Lax** cookie (`koc_token`) holding a JWT. Global guards then authenticate every route that isn't marked `@Public()` and enforce `@Roles(...)`.

| Method | Path | Role | |
|---|---|---|---|
| POST | `/auth/login` | public | `{ email, password }` → user, sets cookie |
| POST | `/auth/logout` | public | clears cookie |
| GET | `/me` | any | current user |
| GET | `/tournaments?status=open,ongoing` | any | list (students never see drafts) |
| GET | `/tournaments/:id` | any | detail + participants + progress |
| GET | `/tournaments/:id/leaderboard` | any | standings, winner, stats |
| GET | `/tournaments/:id/matches` | any | per-match results |
| POST | `/tournaments` | coach | create `{ name, description?, timeControlMinutes, incrementSeconds, startsAt (ISO), status?: draft\|open }` |
| PATCH | `/tournaments/:id` | coach | edit (time control locked once ongoing) |
| PATCH | `/tournaments/:id/status` | coach | `{ status }`: draft ⇄ open → ongoing → completed |
| DELETE | `/tournaments/:id` | coach | only before it starts |
| POST / DELETE | `/tournaments/:id/participants[/:userId]` | coach | add/remove a student (before start) |
| GET | `/students` | coach | students to add |
| POST / DELETE | `/tournaments/:id/join` | student | self-join / withdraw (while open) |
| GET | `/matches/:id` | player or coach | full match state (board, clock, PGN) |
| GET | `/me/matches?tournamentId=` | student | my match history |
| GET | `/me/active-match` | student | `{ matchId \| null }`, used to resume after a refresh |
| GET | `/me/schedule` | student | my open/ongoing tournaments, rank, points, opponents still to play |

## 6. Socket.IO events

The client connects to the API origin with `withCredentials: true`. The handshake is authenticated with **the same httpOnly cookie**; a missing or invalid session gets `connect_error: UNAUTHORIZED`. Each socket automatically joins a private `user:<id>` room.

Client → server events take an acknowledgement callback. It returns `{ ok: true, data }` or `{ ok: false, error: { code, message } }`, the same idea as the REST envelope, so the client never waits on a callback that won't come.

| Event | Direction | Payload | Ack `data` / notes |
|---|---|---|---|
| `queue:join` | C → S | `{ tournamentId }` | `{ queue: QueueStatus, match: MatchState \| null }`. Pairs immediately if someone suitable is waiting. |
| `queue:leave` | C → S | `{ tournamentId }` | `QueueStatus` |
| `queue:status` | C → S | `{ tournamentId }` | `QueueStatus` |
| `tournament:watch` / `tournament:unwatch` | C → S | `{ tournamentId }` | join/leave the tournament room for live updates |
| `match:join` | C → S | `{ matchId }` | `MatchState`. Players of that match, or a coach spectating; anyone else gets `FORBIDDEN`. |
| `match:leave` | C → S | `{ matchId }` | |
| `match:move` | C → S | `{ matchId, from, to, promotion?: q\|r\|b\|n }` | `MatchState`, or `NOT_YOUR_TURN` / `ILLEGAL_MOVE` / `NOT_A_PLAYER` / `GAME_OVER` |
| `match:resign` | C → S | `{ matchId }` | `MatchState` |
| `match:offer-draw` | C → S | `{ matchId }` | `MatchState`. A counter-offer counts as acceptance. |
| `match:respond-draw` | C → S | `{ matchId, accept: boolean }` | `MatchState` |
| `match:found` | S → C (`user:<id>`) | `{ matchId, tournamentId }` | sent to both paired players; the client navigates into the game |
| `queue:status` | S → C (`user:<id>`) | `QueueStatus` = `{ tournamentId, queued, waiting }` | waiting count changed, or the queue closed |
| `match:state` | S → C (`match:<id>`) | `MatchState` | after **every** change: move, draw offer, game end |
| `tournament:updated` | S → C (`tournament:<id>`) | `{ tournamentId }` | standings, roster or status changed; clients refetch via TanStack Query |

`MatchState` = `{ matchId, tournamentId, tournamentName, timeControl, white, black, fen, pgn, moves[], lastMove, turn, inCheck, clock: { whiteMs, blackMs, running }, serverNow, status, result, termination, drawOfferBy, startedAt, endedAt }`

---

## 7. Decisions & trade-offs

### The live game is server-authoritative
- Clients send *intents* such as "move e2→e4". The server holds the only real `chess.js` instance for each live game. It checks that the sender is a player in this game, that it's their turn, and that the move is legal. Only then does it apply the move and broadcast the full new `MatchState` to the room. A tampered client can't move for the opponent, play an illegal move, edit its own clock or report a result. The result is always derived on the server.
- **Clients converge by replacement, not by merging.** Every change broadcasts the complete state rather than a diff. A client that missed a message, reconnected or refreshed simply takes the next snapshot, so the two boards can't drift apart. The client shows its own move optimistically (pre-checked locally with chess.js so it feels instant) and rolls back if the server rejects it.
- **Clock.** The server stores `whiteMs`, `blackMs`, `turnStartedAt` and whose turn it is. Only the side to move is charged, and the charge is computed from `turnStartedAt` when a move arrives, so it's exact. Increment (e.g. 5+3) is added after each move. A `setTimeout` armed for the side to move ends the game on time even if nobody acts; a move that arrives after the flag fell is scored as a timeout, not played. Clients receive the remaining milliseconds and count down from the moment *they received* the state, which avoids clock skew between machines. Their display is cosmetic; the server decides. A flag against a lone king is scored as a draw (FIDE rule).
- **Game end:** checkmate, resignation, timeout, stalemate, draw by agreement, threefold repetition, the 50-move rule and insufficient material. chess.js detects the board-based ones. The PGN, with `Event/White/Black/TimeControl/Result/Termination` headers, is persisted after every move and finalised at the end.
- **Persistence and reconnection.** After each move the FEN, PGN and clock snapshot are written to the `matches` row, queued through a per-game promise chain so writes land in move order. Refreshing the page or dropping the connection and coming back rejoins the room and restores the board and clock. The server's clock keeps running while a player is away. The **active game banner** (`/me/active-match`) brings a student back to an unfinished game. **If the API restarts**, live games are re-hydrated from the database on boot and their flag timers are re-armed. Server downtime isn't charged to the player on move: their clock restarts from the last saved snapshot. A failed result write is retried with back-off, and the players stay seated until the result is saved.

### Matchmaking and "never double-booked"
- Each tournament has a waiting queue held in memory. On `queue:join` the server checks the rules: the student is a participant, the tournament is ongoing, they're not in a game, and they still have someone left to play. It then picks an opponent (FIFO in the simple case) and creates the match.
- **Concurrency.** Picking the opponent and removing *both* players from every queue happens in one synchronous block, with no `await` in between. Node runs one thing at a time, so two simultaneous requests can never grab the same waiting player. A player also waits in at most one queue at a time, and a `pairing` set rejects a second tab while a match is being created.
- **Database backstop.** The match is created in a transaction that also inserts both players into `active_players(user_id PRIMARY KEY)`. If a player is already seated anywhere, the insert fails and the pairing is rolled back, so the guarantee also holds across processes. A unique index on `(tournament, least(white, black), greatest(white, black))` enforces "each pair meets once" in the database.
- **Pairing order (stretch goal).** From the eligible waiting players (never someone you've already played) the server picks the one **closest in points**, then whoever has waited longest. Colours go to whoever has had white less often.
- **Round robin (stretch goal).** Each pair plays exactly once. When `played = n(n−1)/2` and nothing is live, the tournament completes itself and records the winner. The coach can also complete it early, which is refused while games are live.
- **Trade-off:** an in-memory queue means one API instance. Scaling out would need the queue and the Socket.IO adapter in Redis, with the pick-and-remove done atomically there (a Lua script or `SELECT … FOR UPDATE SKIP LOCKED`). The database constraints above would keep correctness intact even before that. Live game state is also in memory, but it's snapshotted to Postgres after every move and recovered on boot.
- A player who closes their last tab leaves the queue, so nobody gets paired against an absent opponent. A player who disconnects *mid-game* keeps their clock running and can come back; if they don't, they lose on time. I chose this over abort rules for simplicity.

### Tournaments, scoring and tiebreaks
- Status flow: `draft → open → ongoing → completed`, and `open → draft` is allowed. Students see everything except drafts. They **self-join** while a tournament is open, and the coach can also add or remove students. Starting needs at least 2 players and **locks** the roster and time control.
- Scoring: win 1, draw ½, loss 0. **Tiebreak:** points, then **Sonneborn–Berger** (the sum of the scores of opponents you beat, plus half the scores of opponents you drew), then number of wins. Players level on all three share a rank. SB is the standard round-robin tiebreak and rewards beating strong players. The winner is the sole rank-1 player; if the top is still tied after all tiebreaks, no single winner is declared and the UI says the top spot is shared.
- Standings are computed from completed matches on read rather than stored. With a tournament's worth of games this is cheap, and it means the leaderboard can't drift out of sync with results.
- Roles are global: any coach can manage any tournament (an academy-staff model). Per-coach ownership would be a single `createdById` check.

### Auth
- The JWT lives in an **httpOnly, SameSite=Lax** cookie, so JavaScript can't read the token. The **same cookie authenticates the Socket.IO handshake**, and room joins are checked per match. Unknown emails still run a bcrypt compare, so response timing doesn't reveal which emails exist.
- Frontend enforcement happens on two layers:
  - `src/proxy.ts` (Next 16's renamed middleware) redirects by role, read *optimistically* from the JWT payload without verifying it.
  - `RoleGate` then checks the *verified* `/me` response.
  The API is the real gate either way.
- Running on separate origins in development (`:3000` and `:4000`) works because cookies aren't port-scoped and both origins are same-site. On different production domains you'd put both on one site (subdomains with a cookie `Domain`, or proxy `/api` through Next).

### Frontend
- TanStack Query handles REST. Every mutation invalidates the queries it affects, and **`tournament:updated` pushes invalidate the tournament's queries**, so leaderboards, match lists and schedules update live without polling. Every data view has loading (skeleton), error (with retry) and empty states. Socket calls time out after 8 s with a toast, so nothing hangs, and the header shows the live connection state.
- Next's `cacheComponents` is **off**. All data is fetched client-side from a separate API, so server caching would add constraints without benefit.
- **Dates use DD/MM/YYYY.** They're stored as UTC `timestamptz` and displayed in the viewer's timezone. The create form converts local wall-clock time to an ISO instant and states which timezone it used.
- Other stretch goals done: spectator mode for coaches, draw offers, increment time controls, and move-list navigation (click any move, use the arrow buttons, or copy the PGN).

### Known gaps and what I'd do next
- A Redis-backed queue and Socket.IO adapter for horizontal scale (see above).
- Tests for the services against a real Postgres (Testcontainers), e.g. a pairing race fired from many concurrent sockets. The pure rules and the e2e smoke test are covered today.
- A "first move" grace period and abandonment rules (auto-abort if White never moves); a proper promotion picker dialog (currently a "promote to" toggle that defaults to queen); sound and move animations for kids; rate limiting on login.
- Socket sessions are authenticated at the handshake only. Logging out disconnects the client, but a socket that was already open isn't re-checked when its JWT expires. Next steps: re-verify periodically, or disconnect on expiry, and add an `Origin` allow-list in `allowRequest`.
- Ratings (Elo/Glicko) to make standings-based pairing more meaningful across tournaments.
