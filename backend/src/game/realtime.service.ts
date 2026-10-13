import { Injectable } from '@nestjs/common';
import type { Server } from 'socket.io';

export const rooms = {
  user: (id: string) => `user:${id}`,
  match: (id: string) => `match:${id}`,
  tournament: (id: string) => `tournament:${id}`,
};

/**
 * Holds the Socket.IO server so services can push events without depending on the gateway
 * (which itself depends on those services).
 */
@Injectable()
export class RealtimeService {
  private server: Server | null = null;

  attach(server: Server) {
    this.server = server;
  }

  toUser(userId: string, event: string, payload: unknown) {
    this.server?.to(rooms.user(userId)).emit(event, payload);
  }

  toMatch(matchId: string, event: string, payload: unknown) {
    this.server?.to(rooms.match(matchId)).emit(event, payload);
  }

  toTournament(tournamentId: string, event: string, payload: unknown) {
    this.server?.to(rooms.tournament(tournamentId)).emit(event, payload);
  }

  async isOnline(userId: string): Promise<boolean> {
    if (!this.server) return false;
    return (await this.server.in(rooms.user(userId)).fetchSockets()).length > 0;
  }
}
