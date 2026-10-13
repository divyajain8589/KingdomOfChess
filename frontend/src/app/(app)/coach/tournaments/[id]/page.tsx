"use client";

import { ArrowLeft, CalendarDays, Clock, Loader2, Pencil, Play, Trash2, UserMinus, UserPlus, Users } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { LeaderboardCard } from "@/components/leaderboard";
import { MatchList } from "@/components/match-list";
import { RoleGate } from "@/components/role-gate";
import { EmptyState, ErrorState, LoadingState } from "@/components/states";
import { StatusBadge } from "@/components/status-badge";
import { TournamentForm } from "@/components/tournament-form";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useWatchTournament } from "@/hooks/use-watch-tournament";
import { errorMessage } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import {
  useAddParticipant,
  useDeleteTournament,
  useRemoveParticipant,
  useSetTournamentStatus,
  useStudents,
  useTournament,
  useTournamentMatches,
  useUpdateTournament,
} from "@/lib/queries";
import type { TournamentDetail, TournamentStatus } from "@/lib/types";

export default function CoachTournamentPage() {
  return (
    <RoleGate role="coach">
      <CoachTournament />
    </RoleGate>
  );
}

function CoachTournament() {
  const { id } = useParams<{ id: string }>();
  const q = useTournament(id);
  useWatchTournament(id);

  if (q.isPending) return <LoadingState rows={5} />;
  if (q.isError) return <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  const t = q.data;

  return (
    <div className="space-y-6">
      <Link href="/coach" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> All tournaments
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold">{t.name}</h1>
            <StatusBadge status={t.status} />
          </div>
          {t.description && <p className="max-w-2xl text-muted-foreground">{t.description}</p>}
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Clock className="size-4" /> <span className="font-mono">{t.timeControl}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <CalendarDays className="size-4" /> {formatDateTime(t.startsAt)}
            </span>
            <span className="flex items-center gap-1.5">
              <Users className="size-4" /> {t.participantCount} players
            </span>
          </div>
        </div>
        <TournamentActions t={t} />
      </div>

      <Tabs defaultValue={t.status === "draft" || t.status === "open" ? "participants" : "leaderboard"}>
        <TabsList>
          <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
          <TabsTrigger value="matches">Matches</TabsTrigger>
          <TabsTrigger value="participants">Participants ({t.participantCount})</TabsTrigger>
        </TabsList>
        <TabsContent value="leaderboard" className="mt-4">
          <LeaderboardCard tournamentId={id} />
        </TabsContent>
        <TabsContent value="matches" className="mt-4">
          <MatchesCard tournamentId={id} />
        </TabsContent>
        <TabsContent value="participants" className="mt-4">
          <ParticipantsCard t={t} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

const NEXT_STEP: Partial<Record<TournamentStatus, { to: TournamentStatus; label: string; confirm: string }>> = {
  draft: { to: "open", label: "Open registration", confirm: "Students will be able to see and join this tournament." },
  open: {
    to: "ongoing",
    label: "Start tournament",
    confirm: "Registration closes and players can start finding opponents. The player list and time control are then locked.",
  },
  ongoing: {
    to: "completed",
    label: "Complete tournament",
    confirm:
      "Closes matchmaking and declares the current leader the winner. It also completes automatically once everyone has played everyone.",
  },
};

function TournamentActions({ t }: { t: TournamentDetail }) {
  const setStatus = useSetTournamentStatus(t.id);
  const del = useDeleteTournament();
  const update = useUpdateTournament(t.id);
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const next = NEXT_STEP[t.status];

  async function changeStatus(to: TournamentStatus) {
    try {
      await setStatus.mutateAsync(to);
      toast.success(to === "completed" ? "Tournament completed" : "Status updated");
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {t.status !== "completed" && (
        <Button variant="outline" onClick={() => setEditing(true)}>
          <Pencil /> Edit
        </Button>
      )}
      {t.status === "open" && (
        <Button variant="outline" disabled={setStatus.isPending} onClick={() => changeStatus("draft")}>
          Back to draft
        </Button>
      )}
      {(t.status === "draft" || t.status === "open") && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" className="text-destructive">
              <Trash2 /> Delete
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete “{t.name}”?</AlertDialogTitle>
              <AlertDialogDescription>This removes the tournament and its registrations. It can’t be undone.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                onClick={async () => {
                  try {
                    await del.mutateAsync(t.id);
                    toast.success("Tournament deleted");
                    router.push("/coach");
                  } catch (err) {
                    toast.error(errorMessage(err));
                  }
                }}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
      {next && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button disabled={setStatus.isPending}>
              {setStatus.isPending ? <Loader2 className="animate-spin" /> : <Play />} {next.label}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{next.label}?</AlertDialogTitle>
              <AlertDialogDescription>{next.confirm}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => changeStatus(next.to)}>{next.label}</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit tournament</DialogTitle>
          </DialogHeader>
          <TournamentForm
            initial={t}
            lockTimeControl={t.status === "ongoing"}
            submitLabel="Save changes"
            onCancel={() => setEditing(false)}
            onSubmit={async (input) => {
              const { timeControlMinutes, incrementSeconds, ...rest } = input;
              await update.mutateAsync(t.status === "ongoing" ? rest : { ...rest, timeControlMinutes, incrementSeconds });
              toast.success("Saved");
              setEditing(false);
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MatchesCard({ tournamentId }: { tournamentId: string }) {
  const q = useTournamentMatches(tournamentId);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Matches</CardTitle>
        <CardDescription>Every game in this tournament. Live games can be watched in real time.</CardDescription>
      </CardHeader>
      <CardContent>
        {q.isPending ? (
          <LoadingState />
        ) : q.isError ? (
          <ErrorState error={q.error} onRetry={() => q.refetch()} />
        ) : (
          <MatchList matches={q.data} emptyText="No games played yet" />
        )}
      </CardContent>
    </Card>
  );
}

function ParticipantsCard({ t }: { t: TournamentDetail }) {
  const editable = t.status === "draft" || t.status === "open";
  const students = useStudents(editable);
  const add = useAddParticipant(t.id);
  const remove = useRemoveParticipant(t.id);
  const [selected, setSelected] = useState("");
  const registered = new Set(t.participants.map((p) => p.id));
  const available = students.data?.filter((s) => !registered.has(s.id)) ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Participants</CardTitle>
        <CardDescription>
          {editable
            ? "Students can join themselves while registration is open, or you can add them here."
            : "The player list is locked once the tournament starts."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {editable && (
          <div className="flex flex-wrap gap-2">
            {students.isError ? (
              <ErrorState error={students.error} onRetry={() => students.refetch()} className="w-full" />
            ) : (
              <>
                <Select value={selected} onValueChange={setSelected} disabled={students.isPending || available.length === 0}>
                  <SelectTrigger className="w-64">
                    <SelectValue
                      placeholder={
                        students.isPending ? "Loading students…" : available.length ? "Choose a student" : "Everyone is registered"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {available.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  disabled={!selected || add.isPending}
                  onClick={async () => {
                    try {
                      await add.mutateAsync(selected);
                      setSelected("");
                    } catch (err) {
                      toast.error(errorMessage(err));
                    }
                  }}
                >
                  {add.isPending ? <Loader2 className="animate-spin" /> : <UserPlus />} Add
                </Button>
              </>
            )}
          </div>
        )}
        {t.participants.length === 0 ? (
          <EmptyState title="No participants yet" description="Open registration so students can join, or add them above." />
        ) : (
          <ul className="divide-y rounded-lg border">
            {t.participants.map((p) => (
              <li key={p.id} className="flex items-center justify-between px-4 py-2.5">
                <div>
                  <div className="font-medium">{p.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {p.email} · joined {formatDateTime(p.joinedAt)}
                  </div>
                </div>
                {editable && (
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={remove.isPending}
                    onClick={() => remove.mutateAsync(p.id).catch((err) => toast.error(errorMessage(err)))}
                  >
                    <UserMinus /> Remove
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
