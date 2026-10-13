"use client";

import { ArrowLeft, CalendarDays, Clock, Loader2, LogOut, Trophy, Users } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { FindOpponent } from "@/components/find-opponent";
import { LeaderboardCard } from "@/components/leaderboard";
import { MatchList } from "@/components/match-list";
import { RoleGate } from "@/components/role-gate";
import { ErrorState, LoadingState } from "@/components/states";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useWatchTournament } from "@/hooks/use-watch-tournament";
import { errorMessage } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import { useHistory, useJoinTournament, useLeaveTournament, useMe, useTournament } from "@/lib/queries";
import type { TournamentDetail } from "@/lib/types";

export default function StudentTournamentPage() {
  return (
    <RoleGate role="student">
      <StudentTournament />
    </RoleGate>
  );
}

function StudentTournament() {
  const { id } = useParams<{ id: string }>();
  const q = useTournament(id);
  const me = useMe();
  useWatchTournament(id);

  if (q.isPending) return <LoadingState rows={5} />;
  if (q.isError) return <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  const t = q.data;

  return (
    <div className="space-y-6">
      <Link href="/student" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> All tournaments
      </Link>

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

      <PlayPanel t={t} />

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <LeaderboardCard tournamentId={id} highlightUserId={me.data?.id} />
        </div>
        <div className="lg:col-span-2">{t.joined && <MyGames tournamentId={id} userId={me.data?.id} />}</div>
      </div>
    </div>
  );
}

/** The call to action, depending on tournament status and whether I'm registered. */
function PlayPanel({ t }: { t: TournamentDetail }) {
  const join = useJoinTournament(t.id);
  const leave = useLeaveTournament(t.id);

  const body = (() => {
    if (t.status === "completed") {
      return (
        <p className="flex items-center gap-2">
          <Trophy className="size-4 text-amber-500" />
          This tournament is over{t.winner?.name ? ` — congratulations to ${t.winner.name}!` : "."}
        </p>
      );
    }
    if (!t.joined) {
      if (t.status !== "open") return <p className="text-muted-foreground">Registration has closed for this tournament.</p>;
      return (
        <div className="flex flex-wrap items-center gap-3">
          <Button
            size="lg"
            disabled={join.isPending}
            onClick={() =>
              join.mutateAsync().then(() => toast.success("You're registered!")).catch((err) => toast.error(errorMessage(err)))
            }
          >
            {join.isPending && <Loader2 className="animate-spin" />} Join tournament
          </Button>
          <span className="text-sm text-muted-foreground">Everyone plays everyone once.</span>
        </div>
      );
    }
    if (t.status === "open") {
      return (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p>
            You&apos;re registered. Games start when the coach starts the tournament ({formatDateTime(t.startsAt)}).
          </p>
          <Button
            variant="ghost"
            size="sm"
            disabled={leave.isPending}
            onClick={() => leave.mutateAsync().then(() => toast("You've withdrawn")).catch((err) => toast.error(errorMessage(err)))}
          >
            <LogOut /> Withdraw
          </Button>
        </div>
      );
    }
    // ongoing + joined
    return (
      <div className="flex flex-wrap items-center gap-4">
        <FindOpponent tournamentId={t.id} />
        <p className="text-sm text-muted-foreground">
          {t.progress.played} of {t.progress.total} games played. You&apos;ll be paired with someone you haven&apos;t played yet.
        </p>
      </div>
    );
  })();

  return (
    <Card>
      <CardContent className="py-1">{body}</CardContent>
    </Card>
  );
}

function MyGames({ tournamentId, userId }: { tournamentId: string; userId?: string }) {
  const q = useHistory(tournamentId);
  return (
    <Card>
      <CardHeader>
        <CardTitle>My games</CardTitle>
        <CardDescription>Your results in this tournament.</CardDescription>
      </CardHeader>
      <CardContent>
        {q.isPending ? (
          <LoadingState />
        ) : q.isError ? (
          <ErrorState error={q.error} onRetry={() => q.refetch()} />
        ) : (
          <MatchList matches={q.data} perspective={userId} emptyText="You haven't played yet" />
        )}
      </CardContent>
    </Card>
  );
}
