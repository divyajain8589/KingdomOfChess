"use client";

import { format, formatDistanceToNowStrict, isFuture } from "date-fns";
import { Check } from "lucide-react";
import Link from "next/link";
import { ActiveMatchBanner } from "@/components/active-match-banner";
import { FindOpponent } from "@/components/find-opponent";
import { MatchList } from "@/components/match-list";
import { Accent, MetaLine, PageHeader } from "@/components/page-header";
import { PlayerAvatar } from "@/components/player-avatar";
import { RoleGate } from "@/components/role-gate";
import { Stat } from "@/components/stat";
import { CardSkeleton, EmptyState, ErrorState, TableSkeleton } from "@/components/states";
import { StatusPill } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime, formatPoints } from "@/lib/format";
import { useHistory, useMe, useSchedule } from "@/lib/queries";
import type { MatchSummary, Schedule as ScheduleData } from "@/lib/types";

type Entry = ScheduleData["tournaments"][number];

const MAX_CHIPS = 4;

export default function SchedulePage() {
  return (
    <RoleGate role="student">
      <Schedule />
    </RoleGate>
  );
}

function Schedule() {
  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow="My schedule"
        title={
          <>
            What&apos;s <Accent>next</Accent>
          </>
        }
        description="Your tournaments, who you still need to play, and every game you've finished."
      />
      <ActiveMatchBanner />
      <ComingUp />
      <History />
    </div>
  );
}

function SectionTitle({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="text-h2">
      {children}
    </h2>
  );
}

/* ---------------------------------------------------------------- Coming up & live */

function ComingUp() {
  const schedule = useSchedule();
  return (
    <section aria-labelledby="coming-up" className="space-y-4">
      <SectionTitle id="coming-up">Coming up &amp; live</SectionTitle>
      {schedule.isPending ? (
        <div className="grid gap-4 md:grid-cols-2" role="status" aria-busy="true">
          <span className="sr-only">Loading your tournaments…</span>
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : schedule.isError ? (
        <ErrorState error={schedule.error} onRetry={() => schedule.refetch()} />
      ) : schedule.data.tournaments.length === 0 ? (
        <EmptyState
          art="rook"
          title="Nothing on your schedule"
          description="Join a tournament and your games will show up here."
          action={
            <Button asChild size="lg">
              <Link href="/student">Find a tournament</Link>
            </Button>
          }
        />
      ) : (
        <div className="grid items-start gap-4 md:grid-cols-2">
          {schedule.data.tournaments.map((s) => (
            <ScheduleCard key={s.tournament.id} s={s} />
          ))}
        </div>
      )}
    </section>
  );
}

function ScheduleCard({ s }: { s: Entry }) {
  const t = s.tournament;
  const ongoing = t.status === "ongoing";
  const left = s.remainingOpponents.length;
  const canPlay = ongoing && left > 0;

  return (
    <Card>
      <CardHeader className="gap-2">
        <StatusPill status={t.status} className="justify-self-start" />
        <CardTitle>
          <Link href={`/student/tournaments/${t.id}`} className="focus-ring rounded-sm hover:underline hover:underline-offset-4">
            {t.name}
          </Link>
        </CardTitle>
        <MetaLine>
          {t.timeControl}
          {formatDateTime(t.startsAt)}
          {`${s.players} ${s.players === 1 ? "player" : "players"}`}
        </MetaLine>
      </CardHeader>
      <CardContent className="space-y-5">
        {ongoing && (
          <div className="grid grid-cols-3 gap-2">
            <Stat
              tone="accent"
              label="Rank"
              value={s.gamesPlayed > 0 && s.rank ? `#${s.rank}` : "–"}
              sub={`/ ${s.players}`}
            />
            <Stat label="Points" value={formatPoints(s.points)} />
            <Stat label="Played" value={s.gamesPlayed} />
          </div>
        )}

        {t.status === "open" && (
          <p className="font-mono text-[13px] font-semibold text-foreground tabular-nums">
            {isFuture(new Date(t.startsAt)) ? `Starts in ${formatDistanceToNowStrict(new Date(t.startsAt))}` : "Starts soon"}
            <span aria-hidden className="mx-2 text-border-strong">
              ·
            </span>
            <span className="font-medium text-muted-foreground">{formatDateTime(t.startsAt)}</span>
          </p>
        )}

        {s.players <= 1 ? (
          <p className="rounded-xl bg-surface-inset px-4 py-3 text-[14px] font-semibold text-muted-foreground">
            Waiting for more players to join.
          </p>
        ) : left === 0 ? (
          <p className="flex items-center gap-2 rounded-xl bg-success-soft px-4 py-3 text-[14px] font-semibold text-success">
            <Check className="size-4 shrink-0" aria-hidden /> You&apos;ve played everyone. Well done!
          </p>
        ) : (
          <div className="space-y-2">
            <p className="text-eyebrow text-muted-foreground uppercase">
              Still to play <span className="font-mono">({left})</span>
            </p>
            <ul className="flex flex-wrap gap-2">
              {s.remainingOpponents.slice(0, MAX_CHIPS).map((o) => (
                <li
                  key={o.id}
                  className="inline-flex h-9 max-w-full items-center gap-2 rounded-full bg-surface-inset pr-3 pl-1 text-[13px] font-semibold"
                >
                  <PlayerAvatar name={o.name} userId={o.id} size="sm" />
                  <span className="truncate">{o.name}</span>
                </li>
              ))}
              {left > MAX_CHIPS && (
                <li className="inline-flex h-9 items-center rounded-full border border-dashed border-border-strong px-3 font-mono text-[13px] font-semibold text-muted-foreground">
                  +{left - MAX_CHIPS} more
                </li>
              )}
            </ul>
          </div>
        )}
      </CardContent>
      {canPlay && (
        <CardFooter>
          <FindOpponent tournamentId={t.id} size="lg" className="w-full" />
        </CardFooter>
      )}
    </Card>
  );
}

/* ---------------------------------------------------------------- Match history */

function History() {
  const history = useHistory();
  const me = useMe();

  return (
    <section aria-labelledby="match-history" className="space-y-4">
      <SectionTitle id="match-history">Match history</SectionTitle>
      {history.isPending ? (
        <TableSkeleton rows={4} />
      ) : history.isError ? (
        <ErrorState error={history.error} onRetry={() => history.refetch()} />
      ) : history.data.length === 0 ? (
        <EmptyState
          art="knight"
          title="No games yet"
          description="Your finished games will be listed here, so you can replay them."
        />
      ) : (
        <div className="space-y-6">
          {groupByMonth(history.data).map(([month, matches]) => (
            <div key={month} className="space-y-2">
              <p className="eyebrow">{month}</p>
              <MatchList matches={matches} perspective={me.data?.id} showTournament emptyText="No games yet" />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

/** Newest-first matches → [["October 2026", [...]], ...], keeping order. */
function groupByMonth(matches: MatchSummary[]): [string, MatchSummary[]][] {
  const groups = new Map<string, MatchSummary[]>();
  for (const m of matches) {
    const key = format(new Date(m.startedAt), "MMMM yyyy");
    const list = groups.get(key);
    if (list) list.push(m);
    else groups.set(key, [m]);
  }
  return [...groups];
}
