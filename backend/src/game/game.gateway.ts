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

/**
 * All live traffic. Client → server events are acknowledged with `Ack` (the same success/error
 * shape idea as REST); server → client pushes are listed in the README.
 */
// CORS for the socket server is configured in SocketIoAdapter (needs ConfigService).
@WebSocketGateway()
export class GameGateway implements OnGatewayInit, OnGatewayDisconnect {
  private readonly logger = new Logger(GameGateway.name);

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
    // Handshake auth: the same httpOnly cookie as REST. No valid session → connect_error.
    server.use(async (socket, next) => {
      const user = await this.tokens.verify(this.tokens.fromCookieHeader(socket.handshake.headers.cookie));
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
    if (!(await this.realtime.isOnline(user.id))) this.matchmaking.leave(user.id);
  }

  // ---------------------------------------------------------------- matchmaking

  @SubscribeMessage('queue:join')
  queueJoin(@ConnectedSocket() s: AuthedSocket, @MessageBody() body: unknown) {
    return this.handle(() => {
      const { tournamentId } = parsePayload(TournamentRefDto, body);
      return this.matchmaking.join(s.data.user, tournamentId, () => s.connected);
    });
  }

  @SubscribeMessage('queue:leave')
  queueLeave(@ConnectedSocket() s: AuthedSocket, @MessageBody() body: unknown) {
    return this.handle(() => {
      const { tournamentId } = parsePayload(TournamentRefDto, body);
      return this.matchmaking.leave(s.data.user.id, tournamentId);
    });
  }

  @SubscribeMessage('queue:status')
  queueStatus(@ConnectedSocket() s: AuthedSocket, @MessageBody() body: unknown) {
    return this.handle(() => {
      const { tournamentId } = parsePayload(TournamentRefDto, body);
      return this.matchmaking.status(s.data.user.id, tournamentId);
    });
  }

  // ---------------------------------------------------------------- tournament live updates

  @SubscribeMessage('tournament:watch')
  watch(@ConnectedSocket() s: AuthedSocket, @MessageBody() body: unknown) {
    return this.handle(async () => {
      const { tournamentId } = parsePayload(TournamentRefDto, body);
      await this.tournaments.get(s.data.user, tournamentId); // 404s for students on drafts
      await s.join(rooms.tournament(tournamentId));
      return { tournamentId };
    });
  }

  @SubscribeMessage('tournament:unwatch')
  unwatch(@ConnectedSocket() s: AuthedSocket, @MessageBody() body: unknown) {
    return this.handle(async () => {
      const { tournamentId } = parsePayload(TournamentRefDto, body);
      await s.leave(rooms.tournament(tournamentId));
      return { tournamentId };
    });
  }

  // ---------------------------------------------------------------- match

  /** Join a match room (players, or a coach spectating). Replies with the full current state. */
  @SubscribeMessage('match:join')
  matchJoin(@ConnectedSocket() s: AuthedSocket, @MessageBody() body: unknown) {
    return this.handle(async () => {
      const { matchId } = parsePayload(MatchRefDto, body);
      const state = await this.games.getState(s.data.user, matchId); // throws unless allowed
      await s.join(rooms.match(matchId));
      return state;
    });
  }

  @SubscribeMessage('match:leave')
  matchLeave(@ConnectedSocket() s: AuthedSocket, @MessageBody() body: unknown) {
    return this.handle(async () => {
      const { matchId } = parsePayload(MatchRefDto, body);
      await s.leave(rooms.match(matchId));
      return { matchId };
    });
  }

  @SubscribeMessage('match:move')
  move(@ConnectedSocket() s: AuthedSocket, @MessageBody() body: unknown) {
    return this.handle(() => {
      const { matchId, from, to, promotion } = parsePayload(MoveDto, body);
      return this.games.move(s.data.user, matchId, { from, to, promotion });
    });
  }

  @SubscribeMessage('match:resign')
  resign(@ConnectedSocket() s: AuthedSocket, @MessageBody() body: unknown) {
    return this.handle(() => this.games.resign(s.data.user, parsePayload(MatchRefDto, body).matchId));
  }

  @SubscribeMessage('match:offer-draw')
  offerDraw(@ConnectedSocket() s: AuthedSocket, @MessageBody() body: unknown) {
    return this.handle(() => this.games.offerDraw(s.data.user, parsePayload(MatchRefDto, body).matchId));
  }

  @SubscribeMessage('match:respond-draw')
  respondDraw(@ConnectedSocket() s: AuthedSocket, @MessageBody() body: unknown) {
    return this.handle(() => {
      const { matchId, accept } = parsePayload(DrawResponseDto, body);
      return this.games.respondDraw(s.data.user, matchId, accept);
    });
  }

  /** Run a handler and turn its result or error into an Ack, so clients never hang on a callback. */
  private async handle<T>(fn: () => T | Promise<T>): Promise<Ack<T>> {
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
