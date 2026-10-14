"use client";

import { Eye, RotateCcw } from "lucide-react";
import Link from "next/link";
import { PlayerAvatar } from "@/components/player-avatar";
import { ResultChip } from "@/components/result-chip";
import { EmptyState } from "@/components/states";
import { LivePill } from "@/components/status-badge";
import { buttonVariants } from "@/components/ui/button";
import { YouChip } from "@/components/ui/table";
import { describeResult, formatDate, formatDateTime, outcomeFor, resultScore, TERMINATION_LABEL } from "@/lib/format";
import type { Color, MatchSummary, PlayerRef } from "@/lib/types";
import { cn } from "@/lib/utils";

/** "by checkmate" / "draw by agreement": the short line under the score. */
function shortResult(m: MatchSummary) {
  if (m.status === "ongoing" || !m.result || !m.termination) return "In progress";
  if (m.result === "draw") return m.termination === "timeout" ? "draw, no mating material" : `draw by ${TERMINATION_LABEL[m.termination]}`;
  return `by ${TERMINATION_LABEL[m.termination]}`;
}

/**
 * Games as pairing rows: White · score · Black · meta · action. Live games pin to the top.
 * `perspective` (a user id) adds a W/D/L chip and a "You" marker for that player; `showTournament` adds the event name.
 */
export function MatchList({
  matches,
  perspective,
  showTournament,
  emptyText = "No games yet",
}: {
  matches: MatchSummary[];
  perspective?: string;
  showTournament?: boolean;
  emptyText?: string;
}) {
  if (matches.length === 0) {
    return (
      <EmptyState art="knight" title={emptyText} description="Games appear here as soon as players are paired." />
    );
  }
  const live = matches.filter((m) => m.status === "ongoing");
  const done = matches.filter((m) => m.status !== "ongoing");

  return (
    // Container-driven: stacked cards in narrow columns (phones, the student's 380px "My games" rail),
    // pairing rows once the list itself is at least 48rem wide.
    <div className="@container space-y-6">
      {live.length > 0 && (
        <section className="space-y-3">
          <p className="eyebrow">— Live now</p>
          <Rows matches={live} perspective={perspective} showTournament={showTournament} />
        </section>
      )}
      {done.length > 0 && (
        <section className="space-y-3">
          {live.length > 0 && <p className="eyebrow">— Finished</p>}
          <Rows matches={done} perspective={perspective} showTournament={showTournament} />
        </section>
      )}
    </div>
  );
}

function Rows({ matches, perspective, showTournament }: { matches: MatchSummary[]; perspective?: string; showTournament?: boolean }) {
  return (
    <ul className="space-y-2 @3xl:space-y-0 @3xl:divide-y @3xl:divide-border/70 @3xl:overflow-hidden @3xl:rounded-xl @3xl:border @3xl:border-border @3xl:bg-card @3xl:shadow-card">
      {matches.map((m) => (
        <li key={m.id}>
          <MatchRow m={m} perspective={perspective} showTournament={showTournament} />
        </li>
      ))}
    </ul>
  );
}

function MatchRow({ m, perspective, showTournament }: { m: MatchSummary; perspective?: string; showTournament?: boolean }) {
  const live = m.status === "ongoing";
  const myColor: Color | null = perspective
    ? m.white.id === perspective
      ? "white"
      : m.black.id === perspective
        ? "black"
        : null
    : null;
  const outcome = outcomeFor(m.result, myColor);
  const score = live ? <LivePill /> : <ScorePill>{resultScore(m.result)}</ScorePill>;
  const label = `${live ? "Watch" : "Replay"} ${m.white.name} (White) vs ${m.black.name} (Black). ${
    live ? "Live now" : `${resultScore(m.result)}, ${describeResult(m.result, m.termination)}`
  }`;

  return (
    <Link
      href={`/matches/${m.id}`}
      aria-label={label}
      title={describeResult(m.result, m.termination)}
      className={cn(
        "group/row block outline-none focus-visible:relative focus-visible:z-10 focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-inset",
        // Narrow: a stacked card. Wide: a row inside the shared sheet.
        "rounded-xl border border-border bg-card shadow-card transition-colors hover:bg-surface-raised @3xl:rounded-none @3xl:border-0 @3xl:bg-transparent @3xl:shadow-none",
        live && "border-brand-orange/40 @3xl:bg-brand-orange-soft/30",
      )}
    >
      {/* Narrow */}
      <div className="flex items-center gap-3 p-4 @3xl:hidden">
        <div className="min-w-0 flex-1 space-y-2">
          <StackedPlayer player={m.white} color="white" m={m} perspective={perspective} />
          <StackedPlayer player={m.black} color="black" m={m} perspective={perspective} />
          <div className="flex items-center gap-2 border-t border-border/70 pt-2">
            <p className="min-w-0 flex-1 truncate font-mono text-[12px] text-muted-foreground">
              {showTournament && m.tournament ? `${m.tournament.name} · ` : ""}
              {live ? formatDateTime(m.startedAt) : `${shortResult(m)} · ${formatDate(m.startedAt)}`}
            </p>
            <span
              aria-hidden
              className={cn(
                "inline-flex shrink-0 items-center gap-1 text-[12px] font-bold",
                live ? "text-brand-orange-ink" : "text-muted-foreground group-hover/row:text-foreground",
              )}
            >
              {live ? <Eye className="size-3.5" /> : <RotateCcw className="size-3.5" />}
              {live ? "Watch" : "Replay"}
            </span>
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          {score}
          {outcome && <ResultChip outcome={outcome} />}
        </div>
      </div>

      {/* Wide */}
      <div className="hidden min-h-16 grid-cols-[minmax(0,13rem)_5rem_minmax(0,13rem)_minmax(0,1fr)_6.5rem] items-center gap-4 px-4 py-3 @3xl:grid">
        <PlayerCell player={m.white} color="white" m={m} perspective={perspective} align="end" />
        <div className="flex justify-center">{score}</div>
        <PlayerCell player={m.black} color="black" m={m} perspective={perspective} />
        <div className="flex min-w-0 items-center gap-3">
          {outcome && <ResultChip outcome={outcome} />}
          <div className="min-w-0">
            {showTournament && m.tournament && (
              <p className="truncate text-[13px] font-semibold text-foreground">{m.tournament.name}</p>
            )}
            <p className="truncate text-[12px] text-muted-foreground">{shortResult(m)}</p>
            <p className="font-mono text-[12px] text-muted-foreground tabular-nums">{formatDateTime(m.startedAt)}</p>
          </div>
        </div>
        <span
          aria-hidden
          className={cn(
            buttonVariants({ variant: live ? "outline" : "ghost", size: "sm" }),
            "justify-self-end",
            live && "border-brand-orange text-brand-orange-ink group-hover/row:bg-brand-orange-soft",
            !live && "group-hover/row:bg-surface-inset group-hover/row:text-foreground",
          )}
        >
          {live ? <Eye /> : <RotateCcw />}
          {live ? "Watch" : "Replay"}
        </span>
      </div>
    </Link>
  );
}

function ScorePill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex h-8 min-w-16 items-center justify-center rounded-lg bg-surface-inset px-2 font-mono text-[14px] font-bold tabular-nums">
      {children}
    </span>
  );
}

function nameTone(m: MatchSummary, color: Color) {
  if (!m.result || m.result === "draw") return "font-semibold text-foreground";
  return m.result === color ? "font-extrabold text-foreground" : "font-medium text-muted-foreground";
}

function PlayerCell({
  player,
  color,
  m,
  perspective,
  align = "start",
}: {
  player: PlayerRef;
  color: Color;
  m: MatchSummary;
  perspective?: string;
  align?: "start" | "end";
}) {
  return (
    <div className={cn("flex min-w-0 items-center gap-2.5", align === "end" && "flex-row-reverse text-right")}>
      <PlayerAvatar name={player.name} userId={player.id} size="sm" color={color} />
      <span className={cn("truncate text-[14px]", nameTone(m, color))}>{player.name}</span>
      {perspective === player.id && <YouChip className="ml-0" />}
    </div>
  );
}

function StackedPlayer({ player, color, m, perspective }: { player: PlayerRef; color: Color; m: MatchSummary; perspective?: string }) {
  const won = m.result === color;
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <PlayerAvatar name={player.name} userId={player.id} size="sm" color={color} />
      <span className={cn("truncate text-[14px]", nameTone(m, color))}>{player.name}</span>
      {perspective === player.id && <YouChip className="ml-0" />}
      {won && (
        <span className="ml-auto inline-flex shrink-0 items-center gap-1 text-[11px] font-bold text-win">
          <span aria-hidden className="size-2 rounded-full bg-win" />
          Won
        </span>
      )}
    </div>
  );
}
