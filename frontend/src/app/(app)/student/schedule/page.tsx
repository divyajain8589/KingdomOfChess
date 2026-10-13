"use client";

import { CalendarDays } from "lucide-react";
import Link from "next/link";
import { ActiveMatchBanner } from "@/components/active-match-banner";
import { FindOpponent } from "@/components/find-opponent";
import { MatchList } from "@/components/match-list";
import { RoleGate } from "@/components/role-gate";
import { EmptyState, ErrorState, LoadingState } from "@/components/states";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime, formatPoints } from "@/lib/format";
import { useHistory, useMe, useSchedule } from "@/lib/queries";

export default function SchedulePage() {
  return (
    <RoleGate role="student">
      <Schedule />
    </RoleGate>
  );
}

function Schedule() {
  const schedule = useSchedule();
  const history = useHistory();
  const me = useMe();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">My schedule</h1>
        <p className="text-muted-foreground">Your upcoming and running tournaments, and who you still have to play.</p>
      </div>
      <ActiveMatchBanner />

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Upcoming &amp; in progress</h2>
        {schedule.isPending ? (
          <LoadingState rows={2} />
        ) : schedule.isError ? (
          <ErrorState error={schedule.error} onRetry={() => schedule.refetch()} />
        ) : schedule.data.tournaments.length === 0 ? (
          <EmptyState
            title="Nothing scheduled"
            description="You're not registered in any upcoming tournaments."
            action={
              <Button asChild>
                <Link href="/student">Browse tournaments</Link>
              </Button>
            }
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {schedule.data.tournaments.map((s) => (
              <Card key={s.tournament.id}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle>
                      <Link href={`/student/tournaments/${s.tournament.id}`} className="hover:underline">
                        {s.tournament.name}
                      </Link>
                    </CardTitle>
                    <StatusBadge status={s.tournament.status} />
                  </div>
                  <CardDescription className="flex items-center gap-1.5">
                    <CalendarDays className="size-4" /> {formatDateTime(s.tournament.startsAt)} ·{" "}
                    <span className="font-mono">{s.tournament.timeControl}</span>
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  {s.tournament.status === "ongoing" && (
                    <div className="flex gap-6">
                      <div>
                        <div className="text-xs text-muted-foreground">Rank</div>
                        <div className="text-lg font-semibold">
                          {s.gamesPlayed ? `#${s.rank}` : "–"}
                          <span className="text-sm font-normal text-muted-foreground"> / {s.players}</span>
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Points</div>
                        <div className="text-lg font-semibold">{formatPoints(s.points)}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Played</div>
                        <div className="text-lg font-semibold">{s.gamesPlayed}</div>
                      </div>
                    </div>
                  )}
                  <div>
                    <div className="mb-1 text-xs text-muted-foreground">
                      {s.remainingOpponents.length ? "Still to play" : "Opponents"}
                    </div>
                    {s.remainingOpponents.length ? (
                      <div className="flex flex-wrap gap-1.5">
                        {s.remainingOpponents.map((o) => (
                          <span key={o.id} className="rounded-full bg-muted px-2.5 py-0.5">
                            {o.name}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground">
                        {s.players <= 1 ? "Waiting for more players to register." : "You've played everyone — well done!"}
                      </p>
                    )}
                  </div>
                  {s.tournament.status === "ongoing" && s.remainingOpponents.length > 0 && (
                    <FindOpponent tournamentId={s.tournament.id} size="default" />
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Match history</h2>
        <Card>
          <CardContent>
            {history.isPending ? (
              <LoadingState />
            ) : history.isError ? (
              <ErrorState error={history.error} onRetry={() => history.refetch()} />
            ) : (
              <MatchList matches={history.data} perspective={me.data?.id} showTournament emptyText="No games played yet" />
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
