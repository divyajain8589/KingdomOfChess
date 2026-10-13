export type Role = "coach" | "student";
export type TournamentStatus = "draft" | "open" | "ongoing" | "completed";
export type Color = "white" | "black";
export type MatchResult = "white" | "black" | "draw";
export type MatchTermination =
  | "checkmate"
  | "resignation"
  | "timeout"
  | "stalemate"
  | "draw_agreement"
  | "threefold_repetition"
  | "fifty_move_rule"
  | "insufficient_material";

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
}

export interface PlayerRef {
  id: string;
  name: string;
}

export interface Tournament {
  id: string;
  name: string;
  description: string | null;
  timeControlMinutes: number;
  incrementSeconds: number;
  timeControl: string;
  startsAt: string;
  status: TournamentStatus;
  winner: { id: string; name: string | null } | null;
  completedAt: string | null;
  participantCount: number;
  joined: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TournamentDetail extends Tournament {
  participants: { id: string; name: string; email: string; joinedAt: string }[];
  progress: { played: number; live: number; total: number };
}

export interface Standing {
  rank: number;
  userId: string;
  name: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  points: number;
  sonnebornBerger: number;
}

export interface Leaderboard {
  tournamentId: string;
  status: TournamentStatus;
  standings: Standing[];
  winner: Standing | null;
  stats: { played: number; live: number; total: number; decisive: number; draws: number };
}

export interface MatchSummary {
  id: string;
  tournament?: { id: string; name: string };
  status: "ongoing" | "completed";
  result: MatchResult | null;
  termination: MatchTermination | null;
  startedAt: string;
  endedAt: string | null;
  white: PlayerRef;
  black: PlayerRef;
}

export interface MatchState {
  matchId: string;
  tournamentId: string;
  tournamentName: string;
  timeControl: string;
  white: PlayerRef;
  black: PlayerRef;
  fen: string;
  pgn: string;
  moves: string[];
  lastMove: { from: string; to: string } | null;
  turn: Color;
  inCheck: boolean;
  clock: { whiteMs: number; blackMs: number; running: Color | null };
  serverNow: number;
  status: "ongoing" | "completed";
  result: MatchResult | null;
  termination: MatchTermination | null;
  drawOfferBy: Color | null;
  startedAt: string;
  endedAt: string | null;
}

export interface Schedule {
  activeMatchId: string | null;
  tournaments: {
    tournament: { id: string; name: string; status: TournamentStatus; startsAt: string; timeControl: string };
    rank: number | null;
    points: number;
    players: number;
    gamesPlayed: number;
    remainingOpponents: PlayerRef[];
  }[];
}

export interface QueueStatus {
  tournamentId: string;
  queued: boolean;
  waiting: number;
}
