import { Controller, Get, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { Public } from './common/auth.decorators';
import { CommonModule } from './common/common.module';
import { validateEnv } from './common/env.validation';
import { DbModule } from './db/db.module';
import { GameModule } from './game/game.module';
import { MatchesModule } from './matches/matches.module';
import { TournamentsModule } from './tournaments/tournaments.module';

@Controller('health')
class HealthController {
  @Public()
  @Get()
  health() {
    return { status: 'ok' };
  }
}

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    CommonModule,
    DbModule,
    AuthModule,
    TournamentsModule,
    GameModule,
    MatchesModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
