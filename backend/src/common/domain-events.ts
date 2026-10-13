import { Injectable } from '@nestjs/common';
import { EventEmitter } from 'events';

export interface DomainEventMap {
  /** Anything that changes a tournament's standings, roster or status. */
  'tournament.changed': { tournamentId: string };
  'tournament.closed': { tournamentId: string };
  'match.ended': { matchId: string; tournamentId: string };
}

/**
 * Tiny typed in-process event bus. Lets e.g. the tournament service tell matchmaking to drop a
 * queue without the two depending on each other.
 */
@Injectable()
export class DomainEvents {
  private readonly emitter = new EventEmitter();

  emit<K extends keyof DomainEventMap>(event: K, payload: DomainEventMap[K]) {
    this.emitter.emit(event, payload);
  }

  on<K extends keyof DomainEventMap>(event: K, handler: (payload: DomainEventMap[K]) => void) {
    this.emitter.on(event, handler);
  }
}
