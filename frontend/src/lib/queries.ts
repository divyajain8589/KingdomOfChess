"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./api";
import type {
  Leaderboard,
  MatchState,
  MatchSummary,
  PlayerRef,
  Schedule,
  Tournament,
  TournamentDetail,
  TournamentStatus,
  User,
} from "./types";

export const qk = {
  me: ["me"] as const,
  tournaments: (statuses?: TournamentStatus[]) => ["tournaments", { statuses: statuses ?? [] }] as const,
  tournamentsAll: ["tournaments"] as const,
  tournament: (id: string) => ["tournament", id] as const,
  leaderboard: (id: string) => ["tournament", id, "leaderboard"] as const,
  tournamentMatches: (id: string) => ["tournament", id, "matches"] as const,
  students: ["students"] as const,
  schedule: ["me", "schedule"] as const,
  history: (tournamentId?: string) => ["me", "matches", tournamentId ?? "all"] as const,
  activeMatch: ["me", "active-match"] as const,
  match: (id: string) => ["match", id] as const,
};

// ------------------------------------------------------------------ reads

export const useMe = () => useQuery({ queryKey: qk.me, queryFn: () => api<User>("/me"), retry: false, staleTime: 5 * 60_000 });

export const useTournaments = (statuses?: TournamentStatus[]) =>
  useQuery({
    queryKey: qk.tournaments(statuses),
    queryFn: () => api<Tournament[]>(`/tournaments${statuses?.length ? `?status=${statuses.join(",")}` : ""}`),
  });

export const useTournament = (id: string) =>
  useQuery({ queryKey: qk.tournament(id), queryFn: () => api<TournamentDetail>(`/tournaments/${id}`) });

export const useLeaderboard = (id: string) =>
  useQuery({ queryKey: qk.leaderboard(id), queryFn: () => api<Leaderboard>(`/tournaments/${id}/leaderboard`) });

export const useTournamentMatches = (id: string) =>
  useQuery({ queryKey: qk.tournamentMatches(id), queryFn: () => api<MatchSummary[]>(`/tournaments/${id}/matches`) });

export const useStudents = (enabled = true) =>
  useQuery({ queryKey: qk.students, queryFn: () => api<Student[]>("/students"), enabled });

export const useSchedule = () => useQuery({ queryKey: qk.schedule, queryFn: () => api<Schedule>("/me/schedule") });

export const useHistory = (tournamentId?: string) =>
  useQuery({
    queryKey: qk.history(tournamentId),
    queryFn: () => api<MatchSummary[]>(`/me/matches${tournamentId ? `?tournamentId=${tournamentId}` : ""}`),
  });

export const useActiveMatch = (enabled = true) =>
  useQuery({ queryKey: qk.activeMatch, queryFn: () => api<{ matchId: string | null }>("/me/active-match"), enabled });

export const useMatch = (id: string) =>
  useQuery({ queryKey: qk.match(id), queryFn: () => api<MatchState>(`/matches/${id}`), retry: 1 });

// ------------------------------------------------------------------ writes (each invalidates what it touched)

export interface TournamentInput {
  name: string;
  description?: string;
  timeControlMinutes: number;
  incrementSeconds: number;
  startsAt: string;
  status?: "draft" | "open";
}

function useInvalidateTournament() {
  const qc = useQueryClient();
  return (id?: string) => {
    qc.invalidateQueries({ queryKey: qk.tournamentsAll });
    qc.invalidateQueries({ queryKey: qk.schedule });
    if (id) qc.invalidateQueries({ queryKey: qk.tournament(id) });
  };
}

export function useCreateTournament() {
  const invalidate = useInvalidateTournament();
  return useMutation({
    mutationFn: (input: TournamentInput) => api<Tournament>("/tournaments", { method: "POST", body: input }),
    onSuccess: () => invalidate(),
  });
}

export function useUpdateTournament(id: string) {
  const invalidate = useInvalidateTournament();
  return useMutation({
    mutationFn: (input: Partial<Omit<TournamentInput, "status">>) =>
      api<Tournament>(`/tournaments/${id}`, { method: "PATCH", body: input }),
    onSuccess: () => invalidate(id),
  });
}

export function useSetTournamentStatus(id: string) {
  const invalidate = useInvalidateTournament();
  return useMutation({
    mutationFn: (status: TournamentStatus) =>
      api<TournamentDetail>(`/tournaments/${id}/status`, { method: "PATCH", body: { status } }),
    onSuccess: () => invalidate(id),
  });
}

export function useDeleteTournament() {
  const invalidate = useInvalidateTournament();
  return useMutation({
    mutationFn: (id: string) => api(`/tournaments/${id}`, { method: "DELETE" }),
    onSuccess: () => invalidate(),
  });
}

export function useAddParticipant(id: string) {
  const invalidate = useInvalidateTournament();
  return useMutation({
    mutationFn: (userId: string) => api(`/tournaments/${id}/participants`, { method: "POST", body: { userId } }),
    onSuccess: () => invalidate(id),
  });
}

export function useRemoveParticipant(id: string) {
  const invalidate = useInvalidateTournament();
  return useMutation({
    mutationFn: (userId: string) => api(`/tournaments/${id}/participants/${userId}`, { method: "DELETE" }),
    onSuccess: () => invalidate(id),
  });
}

export function useJoinTournament(id: string) {
  const invalidate = useInvalidateTournament();
  return useMutation({
    mutationFn: () => api<TournamentDetail>(`/tournaments/${id}/join`, { method: "POST" }),
    onSuccess: () => invalidate(id),
  });
}

export function useLeaveTournament(id: string) {
  const invalidate = useInvalidateTournament();
  return useMutation({
    mutationFn: () => api<TournamentDetail>(`/tournaments/${id}/join`, { method: "DELETE" }),
    onSuccess: () => invalidate(id),
  });
}

// ------------------------------------------------------------------ accounts

export type Student = PlayerRef & { email: string };

export function useCreateStudent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string; email: string; password: string }) =>
      api<Student>("/students", { method: "POST", body: input }),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.students }),
  });
}

export function useSetStudentPassword() {
  return useMutation({
    mutationFn: ({ id, password }: { id: string; password: string }) =>
      api<Student>(`/students/${id}/password`, { method: "PATCH", body: { password } }),
  });
}

export function useChangeMyPassword() {
  return useMutation({
    mutationFn: (input: { currentPassword: string; newPassword: string }) =>
      api<{ changed: true }>("/me/password", { method: "PATCH", body: input }),
  });
}
