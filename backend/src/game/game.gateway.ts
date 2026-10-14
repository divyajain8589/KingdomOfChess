import { HttpException, Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import { TokenService } from '../auth/token.service';
import { AuthUser } from '../common/auth.decorators';
import { DomainEvents } from '../common/domain-events';
import { TournamentsService } from '../tournaments/tournaments.service';
import { DrawResponseDto, MatchRefDto, MoveDto, parsePayload, TournamentRefDto } from './game.dto';
import { GameService } from './game.service';
import { MatchmakingService } from './matchmaking.service';
import { RealtimeService, rooms } from './realtime.service';

type Ack<T = unknown> = { ok: true; data: T } | { ok: false; error: { code: string; message: string } };
type AuthedSocket = Socket & { data: { user: AuthUser } };

/** Per-user cap on client → server events (all tabs together); generous for real play. */
const EVENT_WINDOW_MS = 10_000;
const EVENT_LIMIT = 50;

/**
 * All live traffic. Client → server events are acknowledged with `Ack` (the same success/error
 * shape idea as REST); server → client pushes are listed in the README.
 */
// CORS for the socket server is configured in SocketIoAdapter (needs ConfigService).
@WebSocketGateway()
export class GameGateway implements OnGatewayInit, OnGatewayDisconnect {
  private readonly logger = new Logger(GameGateway.name);
  private readonly eventCounts = new Map<string, { windowStart: number; count: number }>();

  constructor(
    private readonly tokens: TokenService,
    private readonly realtime: RealtimeService,
    private readonly games: GameService,
    private readonly matchmaking: MatchmakingService,
    private readonly tournaments: TournamentsService,
    events: DomainEvents,
  ) {
    events.on('tournament.changed', ({ tournamentId }) =>
      this.realtime.toTournament(tournamentId, 'tournament:updated', { tournamentId }),
    );
  }

  afterInit(server: Server) {
    this.realtime.attach(server);
    // Handshake auth: a socket token from GET /auth/socket-token (the web app), or the session cookie
    // when the client shares the API's site (local dev, scripts). No valid session → connect_error.
    server.use(async (socket, next) => {
      const { token } = (socket.handshake.auth ?? {}) as { token?: unknown };
      const user =
        typeof token === 'string'
          ? await this.tokens.verify(token, 'socket')
          : await this.tokens.verify(this.tokens.fromCookieHeader(socket.handshake.headers.cookie));
      if (!user) return next(new Error('UNAUTHORIZED'));
      socket.data.user = user;
      await socket.join(rooms.user(user.id));
      next();
    });
  }

  async handleDisconnect(socket: AuthedSocket) {
    const user = socket.data.user;
    if (!user) return;
    // Leave the queue only when the player's last tab goes away.
    if (!(await this.realtime.isOnline(user.id))) {
      this.matchmaking.leave(user.id);
      this.eventCounts.delete(user.id);
    }
  }

  // ---------------------------------------------------------------- matchmaking

  @SubscribeMessage('queue:join')
  queueJoin(@ConnectedSocket() s: AuthedSocket, @MessageBody() body: unknown) {
    return this.handle(s, () => {
      const { tournamentId } = parsePayload(TournamentRefDto, body);
      return this.matchmaking.join(s.data.user, tournamentId, () => s.connected);
    });
  }

  @SubscribeMessage('queue:leave')
  queueLeave(@ConnectedSocket() s: AuthedSocket, @MessageBody() body: unknown) {
    return this.handle(s, () => {
      const { tournamentId } = parsePayload(TournamentRefDto, body);
      return this.matchmaking.leave(s.data.user.id, tournamentId);
    });
  }

  @SubscribeMessage('queue:status')
  queueStatus(@ConnectedSocket() s: AuthedSocket, @MessageBody() body: unknown) {
    return this.handle(s, () => {
      const { tournamentId } = parsePayload(TournamentRefDto, body);
      return this.matchmaking.status(s.data.user.id, tournamentId);
    });
  }

  // ---------------------------------------------------------------- tournament live updates

  @SubscribeMessage('tournament:watch')
  watch(@ConnectedSocket() s: AuthedSocket, @MessageBody() body: unknown) {
    return this.handle(s, async () => {
      const { tournamentId } = parsePayload(TournamentRefDto, body);
      await this.tournaments.get(s.data.user, tournamentId); // 404s for students on drafts
      await s.join(rooms.tournament(tournamentId));
      return { tournamentId };
    });
  }

  @SubscribeMessage('tournament:unwatch')
  unwatch(@ConnectedSocket() s: AuthedSocket, @MessageBody() body: unknown) {
    return this.handle(s, async () => {
      const { tournamentId } = parsePayload(TournamentRefDto, body);
      await s.leave(rooms.tournament(tournamentId));
      return { tournamentId };
    });
  }

  // ---------------------------------------------------------------- match

  /** Join a match room (players, or a coach spectating). Replies with the full current state. */
  @SubscribeMessage('match:join')
  matchJoin(@ConnectedSocket() s: AuthedSocket, @MessageBody() body: unknown) {
    return this.handle(s, async () => {
      const { matchId } = parsePayload(MatchRefDto, body);
      const state = await this.games.getState(s.data.user, matchId); // throws unless allowed
      await s.join(rooms.match(matchId));
      return state;
    });
  }

  @SubscribeMessage('match:leave')
  matchLeave(@ConnectedSocket() s: AuthedSocket, @MessageBody() body: unknown) {
    return this.handle(s, async () => {
      const { matchId } = parsePayload(MatchRefDto, body);
      await s.leave(rooms.match(matchId));
      return { matchId };
    });
  }

  @SubscribeMessage('match:move')
  move(@ConnectedSocket() s: AuthedSocket, @MessageBody() body: unknown) {
    return this.handle(s, () => {
      const { matchId, from, to, promotion } = parsePayload(MoveDto, body);
      return this.games.move(s.data.user, matchId, { from, to, promotion });
    });
  }

  @SubscribeMessage('match:resign')
  resign(@ConnectedSocket() s: AuthedSocket, @MessageBody() body: unknown) {
    return this.handle(s, () => this.games.resign(s.data.user, parsePayload(MatchRefDto, body).matchId));
  }

  @SubscribeMessage('match:offer-draw')
  offerDraw(@ConnectedSocket() s: AuthedSocket, @MessageBody() body: unknown) {
    return this.handle(s, () => this.games.offerDraw(s.data.user, parsePayload(MatchRefDto, body).matchId));
  }

  @SubscribeMessage('match:respond-draw')
  respondDraw(@ConnectedSocket() s: AuthedSocket, @MessageBody() body: unknown) {
    return this.handle(s, () => {
      const { matchId, accept } = parsePayload(DrawResponseDto, body);
      return this.games.respondDraw(s.data.user, matchId, accept);
    });
  }

  /** Fixed-window counter per user. */
  private overLimit(userId: string): boolean {
    const now = Date.now();
    const entry = this.eventCounts.get(userId);
    if (!entry || now - entry.windowStart >= EVENT_WINDOW_MS) {
      this.eventCounts.set(userId, { windowStart: now, count: 1 });
      return false;
    }
    return ++entry.count > EVENT_LIMIT;
  }

  /** Run a handler and turn its result or error into an Ack, so clients never hang on a callback. */
  private async handle<T>(s: AuthedSocket, fn: () => T | Promise<T>): Promise<Ack<T>> {
    if (this.overLimit(s.data.user.id)) {
      return { ok: false, error: { code: 'TOO_MANY_REQUESTS', message: 'Slow down a little and try again' } };
    }
    try {
      return { ok: true, data: await fn() };
    } catch (err) {
      if (err instanceof HttpException) {
        const body = err.getResponse() as { code?: string; message?: string } | string;
        return {
          ok: false,
          error: {
            code: typeof body === 'object' && body.code ? body.code : 'ERROR',
            message: typeof body === 'string' ? body : (body.message ?? err.message),
          },
        };
      }
      this.logger.error(err instanceof Error ? err.stack : String(err));
      return { ok: false, error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' } };
    }
  }
}
