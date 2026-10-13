import { Module } from '@nestjs/common';
import { TournamentsModule } from '../tournaments/tournaments.module';
import { GameGateway } from './game.gateway';
import { GameService } from './game.service';
import { MatchmakingService } from './matchmaking.service';
import { RealtimeService } from './realtime.service';

@Module({
  imports: [TournamentsModule],
  providers: [RealtimeService, GameService, MatchmakingService, GameGateway],
  exports: [GameService],
})
export class GameModule {}
