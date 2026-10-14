"use client";

import { History, Trophy } from "lucide-react";
import Link from "next/link";
import { FindOpponent } from "@/components/find-opponent";
import { CrownGlyph } from "@/components/logo";
import { Accent } from "@/components/page-header";
import { Piece } from "@/components/states";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { describeResult, outcomeFor, resultScore, TERMINATION_LABEL } from "@/lib/format";
import { useLeaderboard, useTournament } from "@/lib/queries";
import type { Color, MatchState } from "@/lib/types";
import { cn } from "@/lib/utils";

const CONFETTI_COLORS = ["var(--board-light)", "var(--board-dark)", "var(--brand-orange)", "var(--gold)"];

/** 24 tiny squares bursting from the top of the card. CSS only; hidden under reduced motion. */
function Confetti() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-x-0 top-10 z-0 flex justify-center motion-reduce:hidden">
      <style href="koc-confetti" precedence="default">{`
        @keyframes koc-confetti {
          0% { transform: translate(0, 0) rotate(0); opacity: 1; }
          70% { opacity: 1; }
          100% { transform: translate(var(--dx), var(--dy)) rotate(var(--rot)); opacity: 0; }
        }
      `}</style>
      {Array.from({ length: 24 }, (_, i) => {
        // Deterministic spread: alternate sides, varying height and spin.
        const angle = (i / 24) * Math.PI * 2;
        const dist = 90 + ((i * 37) % 70);
        const style = {
          "--dx": `${Math.round(Math.cos(angle) * dist * 1.6)}px`,
          "--dy": `${Math.round(Math.sin(angle) * dist + 70)}px`,
          "--rot": `${((i * 73) % 360) + 180}deg`,
          backgroundColor: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
          animation: `koc-confetti 1.2s cubic-bezier(0.22, 1, 0.36, 1) ${(i % 6) * 25}ms both`,
        } as React.CSSProperties;
        return <span key={i} className="absolute size-2 rounded-[2px]" style={style} />;
      })}
    </div>
  );
}

function ordinal(n: number) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

/** "You won / Nice try / It's a draw" moment on a night card, with the next step right here. */
export function GameOver({
  state,
  myColor,
  isCoach,
  onReplay,
  className,
}: {
  state: MatchState;
  myColor: Color | null;
  isCoach: boolean;
  onReplay: () => void;
  className?: string;
}) {
  const tournament = useTournament(state.tournamentId);
  const leaderboard = useLeaderboard(state.tournamentId);
  const canRequeue = !!myColor && tournament.data?.status === "ongoing";
  const outcome = outcomeFor(state.result, myColor);
  const opponent = myColor ? (myColor === "white" ? state.black : state.white) : null;
  const opponentFirst = opponent?.name.split(/\s+/)[0] ?? "Your opponent";
  const how = state.termination ? TERMINATION_LABEL[state.termination] : null;
  const described = describeResult(state.result, state.termination);

  let art: React.ReactNode;
  let eyebrow: string;
  let title: React.ReactNode;
  let sub: string;
  let extra: string | null = null;

  if (outcome === "win") {
    art = (
      <CrownGlyph className="h-6 w-10 fill-gold drop-shadow-[0_4px_10px_oklch(0.8_0.15_80/0.45)] animate-in fade-in-0 zoom-in-50 duration-500 ease-spring" />
    );
    eyebrow = "Victory";
    title = (
      <>
        You <Accent onNight>won</Accent>!
      </>
    );
    sub =
      state.termination === "checkmate"
        ? "Checkmate. What a finish!"
        : state.termination === "resignation"
          ? `${opponentFirst} resigned.`
          : state.termination === "timeout"
            ? `${opponentFirst} ran out of time.`
            : described;
  } else if (outcome === "loss") {
    art = <Piece code="wN" className="size-12" />;
    eyebrow = "Good game";
    title = "Nice try!";
    sub = how
      ? state.termination === "resignation"
        ? `${opponentFirst} won after you resigned.`
        : `${opponentFirst} won by ${how}.`
      : described;
    extra = "Every game makes you stronger. Replay it to see what happened!";
  } else if (outcome === "draw") {
    art = (
      <span className="flex items-end">
        <Piece code="wK" className="size-11 -rotate-6" />
        <Piece code="bK" className="-ml-2 size-11 rotate-6" />
      </span>
    );
    eyebrow = "Draw";
    title = (
      <>
        It&apos;s a <Accent onNight>draw</Accent>!
      </>
    );
    sub = described;
  } else {
    art = <Piece code={state.result === "black" ? "bK" : "wK"} className="size-12" />;
    eyebrow = "Final";
    title = state.result === "draw" ? "Draw" : state.result === "black" ? "Black wins" : "White wins";
    sub = `${described}.`;
  }

  // "+1 point · You're now #2 in Saturday Blitz Arena"
  const me = myColor ? (myColor === "white" ? state.white : state.black) : null;
  const myStanding = me ? leaderboard.data?.standings.find((s) => s.userId === me.id) : undefined;
  const earned = outcome === "win" ? "+1 point" : outcome === "draw" ? "+½ point" : null;
  const rankPart = myStanding && myStanding.played > 0 ? `You're now ${ordinal(myStanding.rank)} in ${state.tournamentName}` : null;
  const pointsLine = [earned, rankPart].filter(Boolean).join(" · ");

  const leaderboardHref = isCoach ? `/coach/tournaments/${state.tournamentId}` : `/student/tournaments/${state.tournamentId}`;

  return (
    <Card
      variant="night"
      data-outcome={outcome ?? "spectator"}
      className={cn(
        "relative gap-0 p-0 text-center shadow-pop animate-in fade-in-0 zoom-in-95 duration-300 ease-spring",
        className,
      )}
    >
      {outcome === "win" && <Confetti />}
      <div className="relative z-10 flex flex-col items-center px-5 pt-7 pb-5 sm:px-6">
        <div className="grid h-14 place-items-center">{art}</div>
        <p className="mt-3 text-eyebrow text-brand-orange uppercase">{eyebrow}</p>
        <h2 className="mt-1.5 text-[36px] leading-[1.05] font-extrabold tracking-[-0.035em] text-primary-foreground sm:text-display">
          {title}
        </h2>
        <p className="mt-2 text-[15px] text-primary-foreground/80">{sub}</p>
        {extra && <p className="mt-1 max-w-xs text-[14px] text-primary-foreground/70">{extra}</p>}
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          <span className="inline-flex h-7 items-center rounded-full bg-white/10 px-3 font-mono text-[14px] font-bold tabular-nums ring-1 ring-white/15">
            <span className="sr-only">Score </span>
            {resultScore(state.result)}
          </span>
        </div>
        {pointsLine && <p className="mt-3 text-[13px] font-semibold text-primary-foreground/70">{pointsLine}</p>}
      </div>

      <div className="relative z-10 flex flex-col gap-2 border-t border-white/10 bg-white/5 p-4 sm:p-5">
        {canRequeue && <FindOpponent tournamentId={state.tournamentId} size="xl" tone="onNight" className="w-full" />}
        <Button variant="onNight" size="lg" className="w-full" onClick={onReplay} disabled={state.moves.length === 0}>
          <History /> Replay this game
        </Button>
        <Button
          asChild
          variant="ghost"
          size="lg"
          className="w-full text-primary-foreground/80 hover:bg-white/10 hover:text-primary-foreground focus-visible:ring-offset-surface-night"
        >
          <Link href={leaderboardHref}>
            <Trophy /> See the leaderboard
          </Link>
        </Button>
      </div>
    </Card>
  );
}
