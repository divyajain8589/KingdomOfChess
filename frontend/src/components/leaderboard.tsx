"use client";

import { useState } from "react";
import { CrownGlyph } from "@/components/logo";
import { PlayerAvatar } from "@/components/player-avatar";
import { RankMedal } from "@/components/rank-medal";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/states";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, YouChip } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatPoints } from "@/lib/format";
import { useLeaderboard } from "@/lib/queries";
import type { Leaderboard, Standing } from "@/lib/types";
import { cn } from "@/lib/utils";

const pts = (p: number) => `${formatPoints(p)} ${p === 1 ? "pt" : "pts"}`;

/** "Kabir and Diya" / "Kabir, Diya and Meera": first names of co-leaders. */
function joinNames(names: string[]) {
  const first = names.map((n) => n.split(/\s+/)[0]);
  return first.length <= 1 ? first.join("") : `${first.slice(0, -1).join(", ")} and ${first[first.length - 1]}`;
}

/**
 * Track which rows changed points between pushes, so they can flash. Uses the "adjust state while rendering"
 * pattern: no effect, no ref. The first load records a baseline and flashes nothing.
 */
function useChangedRows(data: Leaderboard | undefined, updatedAt: number) {
  const [snap, setSnap] = useState<{ at: number; points: Map<string, number>; changed: Set<string> } | null>(null);
  if (data && (!snap || snap.at !== updatedAt)) {
    const points = new Map(data.standings.map((s) => [s.userId, s.points]));
    const changed = new Set<string>();
    if (snap) for (const [id, p] of points) if (snap.points.has(id) && snap.points.get(id) !== p) changed.add(id);
    setSnap({ at: updatedAt, points, changed });
  }
  return snap ?? { at: 0, changed: new Set<string>() };
}

const flash = (el: HTMLTableRowElement | null) => {
  if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  el.animate([{ backgroundColor: "var(--brand-orange-soft)" }, { backgroundColor: "transparent" }], {
    duration: 1200,
    easing: "cubic-bezier(0.22,1,0.36,1)",
  });
};

/**
 * Live leaderboard (refreshed via `tournament:updated` pushes, see SocketProvider): champion banner when finished,
 * podium once games have been played, standings table with an SB tooltip. `highlightUserId` marks the viewer's row.
 * `showProgress` adds a "3 of 6 games played" line (off where the page already shows a progress strip).
 */
export function LeaderboardCard({
  tournamentId,
  highlightUserId,
  showProgress = true,
}: {
  tournamentId: string;
  highlightUserId?: string;
  showProgress?: boolean;
}) {
  const q = useLeaderboard(tournamentId);
  const rows = useChangedRows(q.data, q.dataUpdatedAt);

  if (q.isPending) return <TableSkeleton rows={4} />;
  if (q.isError) return <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  const lb = q.data;
  if (lb.standings.length === 0) {
    return <EmptyState art="pawns" title="No players yet" description="Players show up here once they join." />;
  }

  const anyPlayed = lb.stats.played > 0;
  const showPodium = anyPlayed && (lb.status === "completed" || lb.status === "ongoing") && lb.standings.length >= 2;

  return (
    <div className="space-y-6">
      {lb.status === "completed" && <ChampionBanner lb={lb} />}
      {showPodium && <Podium standings={lb.standings} completed={lb.status === "completed"} highlightUserId={highlightUserId} />}

      <div className="space-y-3">
        {showProgress && (
          <p className="font-mono text-[13px] text-muted-foreground tabular-nums">
            {lb.stats.played} of {lb.stats.total} {lb.stats.total === 1 ? "game" : "games"} played
            {lb.stats.live > 0 && ` · ${lb.stats.live} live now`}
          </p>
        )}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <span className="sr-only sm:not-sr-only">Rank</span>
                <span aria-hidden className="sm:hidden">#</span>
              </TableHead>
              <TableHead>Player</TableHead>
              <TableHead className="text-right">Pts</TableHead>
              <TableHead className="text-right">
                <abbr title="Wins / draws / losses" className="no-underline">
                  W/D/L
                </abbr>
              </TableHead>
              <TableHead className="hidden text-right sm:table-cell">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className="focus-ring cursor-help rounded-sm uppercase underline decoration-dotted underline-offset-4"
                    >
                      SB
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-64 text-[12px] leading-snug font-medium normal-case">
                    Sonneborn–Berger tiebreak: the scores of every player you beat, plus half the scores of every player you drew with.
                  </TooltipContent>
                </Tooltip>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lb.standings.map((s) => {
              const changed = rows.changed.has(s.userId);
              const you = s.userId === highlightUserId;
              return (
                <TableRow
                  key={changed ? `${s.userId}:${rows.at}` : s.userId}
                  ref={changed ? flash : undefined}
                  data-you={you || undefined}
                >
                  <TableCell>
                    <RankMedal rank={anyPlayed ? s.rank : null} />
                  </TableCell>
                  <TableCell className="max-w-0 w-full">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <PlayerAvatar name={s.name} userId={s.userId} size="sm" />
                      <span className="truncate font-semibold">{s.name}</span>
                      {you && <YouChip className="ml-0" />}
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-mono text-[16px] font-bold tabular-nums">{formatPoints(s.points)}</TableCell>
                  <TableCell className="text-right font-mono text-[12px] tabular-nums">
                    <span className="sr-only">
                      {s.wins} wins, {s.draws} draws, {s.losses} losses
                    </span>
                    <span aria-hidden className="hidden gap-1.5 sm:inline-flex">
                      <span className="text-win">{s.wins}W</span>
                      <span className="text-draw">{s.draws}D</span>
                      <span className="text-loss">{s.losses}L</span>
                    </span>
                    <span aria-hidden className="text-muted-foreground sm:hidden">
                      {s.wins}-{s.draws}-{s.losses}
                    </span>
                  </TableCell>
                  <TableCell className="hidden text-right font-mono text-muted-foreground tabular-nums sm:table-cell">
                    {formatPoints(s.sonnebornBerger)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        <p className="text-[12px] text-muted-foreground">Win 1 · Draw ½ · Loss 0. Ties are split by SB, then by number of wins.</p>
      </div>
    </div>
  );
}

function ChampionBanner({ lb }: { lb: Leaderboard }) {
  const leaders = lb.standings.filter((s) => s.rank === 1 && s.played > 0);
  return (
    <Card variant="night" className="px-5 sm:px-6">
      <div className="flex items-center gap-4">
        <span aria-hidden className="grid size-12 shrink-0 place-items-center rounded-full bg-gold/20 ring-2 ring-gold/40">
          <CrownGlyph className="w-6 fill-gold" />
        </span>
        <div className="min-w-0">
          <p className="text-eyebrow text-brand-orange uppercase">Champion</p>
          {lb.winner ? (
            <p className="mt-1 text-h2 text-primary-foreground">
              {lb.winner.name} <span className="font-mono text-brand-orange">{pts(lb.winner.points)}</span>
            </p>
          ) : leaders.length > 1 ? (
            <p className="mt-1 text-h2 text-primary-foreground">
              Shared first place: {joinNames(leaders.map((l) => l.name))}{" "}
              <span className="font-mono text-brand-orange">{pts(leaders[0].points)}</span>
            </p>
          ) : (
            <p className="mt-1 text-h2 text-primary-foreground">Finished without a result</p>
          )}
        </div>
      </div>
    </Card>
  );
}

const PODIUM = [
  { place: 1, plinth: "h-14 sm:h-16" }, // 2nd, left
  { place: 0, plinth: "h-20 sm:h-24" }, // 1st, centre
  { place: 2, plinth: "h-10 sm:h-12" }, // 3rd, right
] as const;

function Podium({ standings, completed, highlightUserId }: { standings: Standing[]; completed: boolean; highlightUserId?: string }) {
  return (
    <div className="mx-auto grid w-full max-w-xl grid-cols-3 items-end gap-2 sm:gap-3" aria-label="Top three">
      {PODIUM.map(({ place, plinth }) => {
        const s = standings[place];
        if (!s) return <div key={place} aria-hidden />;
        const champion = completed && place === 0 && s.rank === 1;
        return (
          <div key={s.userId} className="flex min-w-0 flex-col items-center text-center">
            {champion && <p className="text-eyebrow text-gold-ink uppercase">Champion</p>}
            <div className="relative mt-2">
              {champion && (
                <CrownGlyph className="absolute -top-3.5 left-1/2 w-5 -translate-x-1/2 fill-gold sm:-top-4 sm:w-6" />
              )}
              <PlayerAvatar name={s.name} userId={s.userId} size="lg" className="max-sm:hidden" />
              <PlayerAvatar name={s.name} userId={s.userId} size="md" className="sm:hidden" />
            </div>
            <p className="mt-2 flex w-full min-w-0 items-center justify-center gap-1 text-[13px] font-bold sm:text-[14px]">
              <span className="truncate">{s.name}</span>
              {s.userId === highlightUserId && <YouChip className="ml-0 shrink-0" />}
            </p>
            <p className="font-mono text-[13px] text-muted-foreground tabular-nums">{pts(s.points)}</p>
            <div
              className={cn(
                "mt-2 flex w-full justify-center rounded-t-xl pt-2",
                plinth,
                champion ? "bg-gold-soft" : "bg-surface-inset",
              )}
            >
              <RankMedal rank={s.rank} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
