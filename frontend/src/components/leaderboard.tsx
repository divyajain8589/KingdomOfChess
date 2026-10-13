"use client";

import { Trophy } from "lucide-react";
import { EmptyState, ErrorState, LoadingState } from "@/components/states";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatPoints } from "@/lib/format";
import { useLeaderboard } from "@/lib/queries";
import { cn } from "@/lib/utils";

/** Live leaderboard: refreshed via `tournament:updated` pushes (see SocketProvider). */
export function LeaderboardCard({ tournamentId, highlightUserId }: { tournamentId: string; highlightUserId?: string }) {
  const q = useLeaderboard(tournamentId);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="size-4 text-brand-orange" /> Leaderboard
        </CardTitle>
        <CardDescription>
          Win 1 · Draw ½ · Loss 0. Ties broken by Sonneborn–Berger (SB), then wins.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {q.isPending ? (
          <LoadingState rows={4} />
        ) : q.isError ? (
          <ErrorState error={q.error} onRetry={() => q.refetch()} />
        ) : q.data.standings.length === 0 ? (
          <EmptyState title="No players yet" description="Players appear here once they join." />
        ) : (
          <>
            {q.data.status === "completed" && (
              <div className="mb-4 flex items-center gap-3 rounded-lg border border-amber-300 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950/40">
                <Trophy className="size-6 text-amber-500" />
                {q.data.winner ? (
                  <div>
                    <div className="text-xs tracking-wide text-muted-foreground uppercase">Winner</div>
                    <div className="font-semibold">
                      {q.data.winner.name} · {formatPoints(q.data.winner.points)} pts
                    </div>
                  </div>
                ) : (
                  <div className="text-sm">Tournament complete — the top spot is shared.</div>
                )}
              </div>
            )}
            <div className="mb-3 text-sm text-muted-foreground">
              {q.data.stats.played} of {q.data.stats.total} games played
              {q.data.stats.live > 0 && ` · ${q.data.stats.live} live now`}
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">#</TableHead>
                  <TableHead>Player</TableHead>
                  <TableHead className="text-right">Pts</TableHead>
                  <TableHead className="hidden text-right sm:table-cell">W / D / L</TableHead>
                  <TableHead className="text-right">SB</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {q.data.standings.map((s) => (
                  <TableRow key={s.userId} className={cn(s.userId === highlightUserId && "bg-primary/5 font-medium")}>
                    <TableCell>{s.played === 0 && q.data.stats.played === 0 ? "–" : s.rank}</TableCell>
                    <TableCell>
                      {s.name}
                      {s.userId === highlightUserId && <span className="ml-1 text-xs text-muted-foreground">(you)</span>}
                    </TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">{formatPoints(s.points)}</TableCell>
                    <TableCell className="hidden text-right tabular-nums sm:table-cell">
                      {s.wins} / {s.draws} / {s.losses}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground tabular-nums">{s.sonnebornBerger}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </>
        )}
      </CardContent>
    </Card>
  );
}
