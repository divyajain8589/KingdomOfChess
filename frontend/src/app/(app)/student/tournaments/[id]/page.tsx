"use client";

import { Check, LogOut } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { FindOpponent } from "@/components/find-opponent";
import { LeaderboardCard } from "@/components/leaderboard";
import { CrownGlyph } from "@/components/logo";
import { MatchList } from "@/components/match-list";
import { Accent, MetaLine, PageHeader } from "@/components/page-header";
import { PlayerAvatar } from "@/components/player-avatar";
import { RoleGate } from "@/components/role-gate";
import { CardSkeleton, EmptyState, ErrorState, HeaderSkeleton, TableSkeleton } from "@/components/states";
import { StatusPill } from "@/components/status-badge";
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
import { Skeleton } from "@/components/ui/skeleton";
import { useWatchTournament } from "@/hooks/use-watch-tournament";
import { errorMessage } from "@/lib/api";
import { formatDate, formatDateTime, formatPoints } from "@/lib/format";
import {
  useActiveMatch,
  useHistory,
  useJoinTournament,
  useLeaderboard,
  useLeaveTournament,
  useMe,
  useSchedule,
  useTournament,
} from "@/lib/queries";
import type { TournamentDetail, User } from "@/lib/types";
import { cn } from "@/lib/utils";

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

  if (q.isPending) {
    return (
      <div className="space-y-10">
        <HeaderSkeleton />
        <CardSkeleton />
        <TableSkeleton rows={4} />
      </div>
    );
  }
  if (q.isError) {
    return (
      <div className="space-y-6">
        <PageHeader back={{ href: "/student", label: "All tournaments" }} title="Tournament" />
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      </div>
    );
  }
  const t = q.data;

  return (
    <div className="space-y-6">
      <PageHeader
        band
        back={{ href: "/student", label: "All tournaments" }}
        eyebrow={eyebrowFor(t)}
        title={t.name}
        badge={<StatusPill status={t.status} />}
        description={t.description ?? undefined}
        meta={
          <MetaLine>
            {t.timeControl}
            {formatDateTime(t.startsAt)}
            {`${t.participantCount} ${t.participantCount === 1 ? "player" : "players"}`}
          </MetaLine>
        }
      />

      <PlayPanel t={t} me={me.data} />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        {/* My games first in the DOM so it comes before the standings on mobile. */}
        {t.joined && (
          <div className="lg:col-start-2 lg:row-start-1">
            <MyGames tournamentId={id} userId={me.data?.id} />
          </div>
        )}
        <div className={cn("min-w-0 lg:row-start-1", t.joined ? "lg:col-start-1" : "lg:col-span-2")}>
          <LeaderboardCard tournamentId={id} highlightUserId={me.data?.id} />
        </div>
      </div>
    </div>
  );
}

function eyebrowFor(t: TournamentDetail) {
  switch (t.status) {
    case "open":
      return "Open for registration";
    case "ongoing":
      return `Live now · ${t.progress.played} of ${t.progress.total} games played`;
    case "completed":
      return t.completedAt ? `Finished on ${formatDate(t.completedAt)}` : "Finished";
    default:
      return "Draft";
  }
}

/* ---------------------------------------------------------------- PlayPanel */

/** The hero call to action, depending on tournament status, my registration and my games. */
function PlayPanel({ t, me }: { t: TournamentDetail; me?: User }) {
  if (t.status === "completed") return <ChampionPanel t={t} me={me} />;

  if (!t.joined) {
    if (t.status === "open") return <JoinPanel t={t} />;
    return (
      <Card variant="inset">
        <CardContent className="text-[15px] font-semibold text-muted-foreground">
          {t.status === "ongoing"
            ? "Registration closed. You can still watch the live games below."
            : "This tournament isn't open yet."}
        </CardContent>
      </Card>
    );
  }

  if (t.status === "open") return <RegisteredPanel t={t} />;
  return <NextGamePanel t={t} me={me} />;
}

function JoinPanel({ t }: { t: TournamentDetail }) {
  const join = useJoinTournament(t.id);
  return (
    <Card>
      <CardHeader className="gap-2">
        <p className="eyebrow">Registration open</p>
        <CardTitle className="text-h2">Want to play?</CardTitle>
        <CardDescription className="max-w-xl text-[15px]">
          Everyone plays everyone once. Games start when your coach begins the tournament.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Button
          size="xl"
          className="w-full sm:w-auto"
          loading={join.isPending}
          onClick={() =>
            join
              .mutateAsync()
              .then(() => toast.success(`You're in! Good luck in ${t.name}.`))
              .catch((err) => toast.error(errorMessage(err)))
          }
        >
          Join tournament
        </Button>
        <Button asChild variant="ghost" size="lg" className="w-full sm:w-auto">
          <Link href="/student">Not now</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

function RegisteredPanel({ t }: { t: TournamentDetail }) {
  const leave = useLeaveTournament(t.id);
  return (
    <Card variant="inset">
      <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <span className="inline-flex h-8 items-center gap-1.5 rounded-full bg-success-soft px-3 text-[14px] font-extrabold text-success">
            <Check className="size-4" aria-hidden /> You&apos;re in!
          </span>
          <p className="text-[15px] text-foreground">
            Games start when your coach starts the tournament:{" "}
            <span className="font-mono text-[14px] font-semibold tabular-nums">{formatDateTime(t.startsAt)}</span>.
          </p>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" loading={leave.isPending} className="self-start sm:self-auto">
              <LogOut /> Leave tournament
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Leave {t.name}?</AlertDialogTitle>
              <AlertDialogDescription>You can join again while registration is open.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Stay in</AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                onClick={() =>
                  leave
                    .mutateAsync()
                    .then(() => toast(`You've left ${t.name}`))
                    .catch((err) => toast.error(errorMessage(err)))
                }
              >
                Leave tournament
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}

/** Ongoing + registered: find a game, resume one, or "you've played everyone". */
function NextGamePanel({ t, me }: { t: TournamentDetail; me?: User }) {
  const schedule = useSchedule();
  const active = useActiveMatch();
  const [searching, setSearching] = useState(false);

  const entry = schedule.data?.tournaments.find((s) => s.tournament.id === t.id);
  const remaining = entry ? new Set(entry.remainingOpponents.map((o) => o.id)) : null;
  const opponents = t.participants.filter((p) => p.id !== me?.id);
  const gamesLeft = remaining?.size;

  if (gamesLeft === 0 && !active.data?.matchId) {
    return (
      <Card variant="inset">
        <CardContent className="flex items-start gap-3">
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-success-soft text-success">
            <Check className="size-4" aria-hidden />
          </span>
          <p className="text-[15px] font-semibold">
            You&apos;ve played everyone. Brilliant work! Results update as the last games finish.
          </p>
        </CardContent>
      </Card>
    );
  }

  const hasGame = !!active.data?.matchId;

  return (
    <Card variant="night">
      <CardContent className="space-y-5">
        {!searching && (
          <div className="space-y-2">
            <p className="text-eyebrow text-brand-orange uppercase">{hasGame ? "Game in progress" : "Your next game"}</p>
            <h2 className="text-[26px] leading-tight font-extrabold tracking-tight text-primary-foreground sm:text-h1">
              {hasGame ? (
                "Your game is on!"
              ) : (
                <>
                  Find an <Accent onNight>opponent</Accent>
                </>
              )}
            </h2>
            <p className="text-[15px] text-primary-foreground/75">
              {hasGame
                ? "Your clock might be ticking. Jump back in."
                : `You'll be paired with someone you haven't played yet.${
                    gamesLeft != null ? ` ${gamesLeft} ${gamesLeft === 1 ? "game" : "games"} left.` : ""
                  }`}
            </p>
          </div>
        )}
        <FindOpponent
          tournamentId={t.id}
          tone="onNight"
          size="xl"
          className={cn(!searching && "w-full sm:w-auto")}
          onQueuedChange={setSearching}
        />
        {!searching && opponents.length > 0 && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-white/10 pt-4">
            {schedule.isPending ? (
              <Skeleton className="h-7 w-40 bg-white/10" />
            ) : remaining ? (
              <>
                <ul className="flex flex-wrap gap-1.5" aria-label="Opponents">
                  {opponents.map((o) => {
                    const played = !remaining.has(o.id);
                    return (
                      <li key={o.id} title={`${o.name}${played ? " (played)" : ""}`} className="relative">
                        <PlayerAvatar
                          name={o.name}
                          userId={o.id}
                          size="sm"
                          className={cn(played && "opacity-40")}
                        />
                        {played && (
                          <span className="absolute -right-1 -bottom-1 grid size-3.5 place-items-center rounded-full bg-success text-white ring-2 ring-surface-night">
                            <Check className="size-2.5" strokeWidth={3} aria-hidden />
                          </span>
                        )}
                        <span className="sr-only">
                          {o.name}, {played ? "played" : "still to play"}
                        </span>
                      </li>
                    );
                  })}
                </ul>
                <span className="font-mono text-[13px] text-primary-foreground/60 tabular-nums">
                  {opponents.length - remaining.size} of {opponents.length} played
                </span>
              </>
            ) : null}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/** Completed: the champion, and how I did. */
function ChampionPanel({ t, me }: { t: TournamentDetail; me?: User }) {
  const lb = useLeaderboard(t.id);
  const standings = lb.data?.standings ?? [];
  const winners = standings.filter((s) => s.rank === 1 && s.played > 0);
  const mine = me ? standings.find((s) => s.userId === me.id) : undefined;

  const soleWinner = winners[0]?.name ?? t.winner?.name;
  const headline =
    winners.length > 1
      ? `Shared first place: ${winners.map((w) => w.name).join(", ")}`
      : soleWinner
        ? `Congratulations, ${soleWinner}!`
        : "Tournament finished";

  return (
    <Card variant="night">
      <CardContent className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
        <span className="grid size-16 shrink-0 place-items-center rounded-2xl bg-white/10 ring-1 ring-white/15">
          <CrownGlyph className="w-9 fill-gold" />
        </span>
        <div className="min-w-0 space-y-1.5">
          <p className="text-eyebrow text-brand-orange uppercase">Champion</p>
          {lb.isPending ? (
            <Skeleton className="h-8 w-64 bg-white/10" />
          ) : (
            <h2 className="text-[24px] leading-tight font-extrabold tracking-tight text-primary-foreground sm:text-h1">
              {headline}
            </h2>
          )}
          {mine && mine.played > 0 && (
            <p className="text-[15px] text-primary-foreground/75">
              You finished <span className="font-mono font-bold text-primary-foreground">#{mine.rank}</span> of{" "}
              {standings.length} with{" "}
              <span className="font-mono font-bold text-primary-foreground">{formatPoints(mine.points)}</span>{" "}
              {mine.points === 1 ? "point" : "points"}.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/* ---------------------------------------------------------------- My games */

function MyGames({ tournamentId, userId }: { tournamentId: string; userId?: string }) {
  const q = useHistory(tournamentId);
  return (
    <section aria-labelledby="my-games" className="space-y-4">
      <div>
        <p className="eyebrow mb-2">Your results</p>
        <h2 id="my-games" className="text-h2">
          My games
        </h2>
      </div>
      {q.isPending ? (
        <TableSkeleton rows={3} />
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      ) : q.data.length === 0 ? (
        <EmptyState art="knight" title="No games yet" description="Your games will show up here." />
      ) : (
        <MatchList matches={q.data} perspective={userId} emptyText="No games yet" />
      )}
    </section>
  );
}
