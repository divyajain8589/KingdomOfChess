"use client";

import { Check, LogOut } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { ActiveMatchBanner } from "@/components/active-match-banner";
import { FindOpponent } from "@/components/find-opponent";
import { Accent, MetaLine, PageHeader } from "@/components/page-header";
import { RoleGate } from "@/components/role-gate";
import { Stat } from "@/components/stat";
import { CardSkeleton, EmptyState, ErrorState, TournamentRowSkeleton } from "@/components/states";
import { TournamentCard } from "@/components/tournament-card";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { errorMessage } from "@/lib/api";
import { formatDateTime, formatPoints } from "@/lib/format";
import { useJoinTournament, useLeaveTournament, useMe, useSchedule, useTournaments } from "@/lib/queries";
import type { Schedule, Tournament } from "@/lib/types";

type ScheduleEntry = Schedule["tournaments"][number];

export default function StudentHomePage() {
  return (
    <RoleGate role="student">
      <StudentHome />
    </RoleGate>
  );
}

function StudentHome() {
  const me = useMe();
  const q = useTournaments(["open", "ongoing"]);
  const schedule = useSchedule();
  const firstName = me.data?.name.trim().split(/\s+/)[0];

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow={firstName ? `Hi, ${firstName}` : "Welcome back"}
        title={
          <>
            Ready to <Accent>play</Accent>?
          </>
        }
        description="Join a tournament, then find an opponent when it starts."
      />
      <ActiveMatchBanner />
      {q.isPending ? (
        <HomeSkeleton />
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      ) : (
        <HomeSections tournaments={q.data} schedule={schedule.data} />
      )}
    </div>
  );
}

function HomeSkeleton() {
  return (
    <div className="space-y-10" role="status" aria-busy="true">
      <span className="sr-only">Loading tournaments…</span>
      <div className="grid gap-4 md:grid-cols-2">
        <CardSkeleton />
        <CardSkeleton />
      </div>
      <div className="grid gap-3">
        <TournamentRowSkeleton />
        <TournamentRowSkeleton />
        <TournamentRowSkeleton />
      </div>
    </div>
  );
}

function HomeSections({ tournaments, schedule }: { tournaments: Tournament[]; schedule?: Schedule }) {
  const playing = tournaments.filter((t) => t.status === "ongoing" && t.joined);
  const watching = tournaments.filter((t) => t.status === "ongoing" && !t.joined);
  const open = tournaments.filter((t) => t.status === "open");
  const ongoingCount = playing.length + watching.length;

  if (ongoingCount === 0 && open.length === 0) {
    return (
      <EmptyState
        art="king"
        title="No tournaments right now"
        description="Your coach will open one soon. Check back later!"
      />
    );
  }

  return (
    <>
      {ongoingCount > 0 && (
        <section aria-labelledby="playing-now" className="space-y-4">
          <SectionTitle id="playing-now" count={ongoingCount}>
            Playing now
          </SectionTitle>
          {playing.length > 0 && (
            <div className="grid gap-4 md:grid-cols-2">
              {playing.map((t) => (
                <LiveCard key={t.id} t={t} entry={schedule?.tournaments.find((s) => s.tournament.id === t.id)} />
              ))}
            </div>
          )}
          {watching.length > 0 && (
            <div className="grid gap-3">
              {watching.map((t) => (
                <TournamentCard
                  key={t.id}
                  t={t}
                  href={`/student/tournaments/${t.id}`}
                  footer={
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-semibold text-muted-foreground">Registration closed</span>
                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/student/tournaments/${t.id}`}>Watch</Link>
                      </Button>
                    </div>
                  }
                />
              ))}
            </div>
          )}
        </section>
      )}

      <section aria-labelledby="join-a-tournament" className="space-y-4">
        <SectionTitle id="join-a-tournament" count={open.length}>
          Join a tournament
        </SectionTitle>
        {open.length === 0 ? (
          <p className="rounded-xl bg-surface-inset px-5 py-4 text-[14px] font-semibold text-muted-foreground">
            No new tournaments to join. Check back soon!
          </p>
        ) : (
          <div className="grid gap-3">
            {open.map((t) => (
              <TournamentCard key={t.id} t={t} href={`/student/tournaments/${t.id}`} footer={<JoinAction t={t} />} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}

function SectionTitle({ id, count, children }: { id: string; count: number; children: React.ReactNode }) {
  return (
    <h2 id={id} className="flex items-baseline gap-2 text-h2">
      {children}
      <span className="font-mono text-[13px] font-semibold text-muted-foreground tabular-nums">{count}</span>
    </h2>
  );
}

/** Feature card for an ongoing tournament I'm playing in: my numbers + the play CTA. */
function LiveCard({ t, entry }: { t: Tournament; entry?: ScheduleEntry }) {
  const href = `/student/tournaments/${t.id}`;
  const gamesLeft = entry?.remainingOpponents.length;
  const done = gamesLeft === 0 && (entry?.players ?? 0) > 1;

  return (
    <Card className="border-t-4 border-t-brand-orange">
      <CardHeader className="gap-2">
        <p className="eyebrow">Live now</p>
        <CardTitle className="text-h2">
          <Link href={href} className="focus-ring rounded-sm hover:underline hover:underline-offset-4">
            {t.name}
          </Link>
        </CardTitle>
        <MetaLine>
          {t.timeControl}
          {formatDateTime(t.startsAt)}
          {`${t.participantCount} ${t.participantCount === 1 ? "player" : "players"}`}
        </MetaLine>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-2">
          <Stat
            tone="accent"
            label="Your rank"
            value={entry && entry.gamesPlayed > 0 && entry.rank ? `#${entry.rank}` : "–"}
            sub={entry ? `/ ${entry.players}` : undefined}
          />
          <Stat label="Points" value={entry ? formatPoints(entry.points) : "–"} />
          <Stat label="Games left" value={gamesLeft ?? "–"} />
        </div>
        {done ? (
          <p className="rounded-xl bg-success-soft px-4 py-3 text-[14px] font-semibold text-success">
            You&apos;ve played everyone. Brilliant work!
          </p>
        ) : (
          <FindOpponent tournamentId={t.id} size="xl" className="w-full" />
        )}
      </CardContent>
    </Card>
  );
}

/** Right-hand action on an open tournament row: Join, or "You're in" + Leave. */
function JoinAction({ t }: { t: Tournament }) {
  const join = useJoinTournament(t.id);
  const leave = useLeaveTournament(t.id);

  if (!t.joined) {
    return (
      <Button
        size="lg"
        loading={join.isPending}
        onClick={() =>
          join
            .mutateAsync()
            .then(() => toast.success(`You're in! Good luck in ${t.name}.`))
            .catch((err) => toast.error(errorMessage(err)))
        }
      >
        Join
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <span className="inline-flex h-9 items-center gap-1.5 rounded-full bg-success-soft px-3 text-[13px] font-bold text-success">
        <Check className="size-4" aria-hidden /> You&apos;re in
      </span>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="ghost" size="sm" loading={leave.isPending} aria-label={`Leave ${t.name}`}>
            <LogOut />
            <span className="hidden sm:inline">Leave</span>
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
    </div>
  );
}
