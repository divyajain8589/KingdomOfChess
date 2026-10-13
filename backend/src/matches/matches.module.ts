import { Module } from '@nestjs/common';
import { GameModule } from '../game/game.module';
import { TournamentsModule } from '../tournaments/tournaments.module';
import { MatchesController } from './matches.controller';
import { MatchesService } from './matches.service';

@Module({
  imports: [GameModule, TournamentsModule],
  controllers: [MatchesController],
  providers: [MatchesService],
})
export class MatchesModule {}
