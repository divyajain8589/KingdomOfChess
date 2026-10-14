import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { AuthUser, CurrentUser, Roles } from '../common/auth.decorators';
import {
  AddParticipantDto,
  CreateTournamentDto,
  ListTournamentsQuery,
  UpdateStatusDto,
  UpdateTournamentDto,
} from './tournament.dto';
import { TournamentsService } from './tournaments.service';

const Id = () => Param('id', new ParseUUIDPipe());

@Controller('tournaments')
export class TournamentsController {
  constructor(private readonly tournaments: TournamentsService) {}

  // ---- shared (coach + student; students never see drafts)

  @Get()
  list(@CurrentUser() user: AuthUser, @Query() q: ListTournamentsQuery) {
    return this.tournaments.list(user, q.status);
  }

  @Get(':id')
  get(@CurrentUser() user: AuthUser, @Id() id: string) {
    return this.tournaments.get(user, id);
  }

  @Get(':id/leaderboard')
  leaderboard(@CurrentUser() user: AuthUser, @Id() id: string) {
    return this.tournaments.leaderboard(user, id);
  }

  @Get(':id/matches')
  matches(@CurrentUser() user: AuthUser, @Id() id: string) {
    return this.tournaments.matches(user, id);
  }

  // ---- coach

  @Roles('coach')
  @Post()
  create(@CurrentUser() coach: AuthUser, @Body() dto: CreateTournamentDto) {
    return this.tournaments.create(coach, dto);
  }

  @Roles('coach')
  @Patch(':id')
  update(@Id() id: string, @Body() dto: UpdateTournamentDto) {
    return this.tournaments.update(id, dto);
  }

  @Roles('coach')
  @Patch(':id/status')
  setStatus(@CurrentUser() coach: AuthUser, @Id() id: string, @Body() dto: UpdateStatusDto) {
    return this.tournaments.setStatus(coach, id, dto.status);
  }

  @Roles('coach')
  @Delete(':id')
  remove(@Id() id: string) {
    return this.tournaments.remove(id);
  }

  @Roles('coach')
  @Post(':id/participants')
  addParticipant(@Id() id: string, @Body() dto: AddParticipantDto) {
    return this.tournaments.addParticipant(id, dto.userId);
  }

  @Roles('coach')
  @Delete(':id/participants/:userId')
  removeParticipant(@Id() id: string, @Param('userId', new ParseUUIDPipe()) userId: string) {
    return this.tournaments.removeParticipant(id, userId);
  }

  // ---- student

  @Roles('student')
  @Post(':id/join')
  join(@CurrentUser() student: AuthUser, @Id() id: string) {
    return this.tournaments.join(student, id);
  }

  @Roles('student')
  @Delete(':id/join')
  leave(@CurrentUser() student: AuthUser, @Id() id: string) {
    return this.tournaments.leave(student, id);
  }
}
