"use client";

import { Timer } from "lucide-react";
import { useEffect, useState } from "react";
import { formatClock } from "@/lib/format";
import { cn } from "@/lib/utils";

const LOW_MS = 20_000;

/**
 * Displays server time minus what's elapsed locally since the snapshot arrived. Using our own
 * receive time (not the server's timestamp) makes it immune to clock skew between machines.
 * The display is cosmetic — the server decides when a flag falls.
 *
 * States: idle / active / low-time active (breathing red + Timer icon) / low-time idle / flagged / game over.
 * `announce` adds a one-off screen-reader alert when this clock drops under 20s (use it for your own clock).
 */
export function ChessClock({
  ms,
  running,
  receivedAt,
  label,
  active,
  gameOver = false,
  announce = false,
  className,
}: {
  ms: number;
  running: boolean;
  receivedAt: number;
  /** Accessible name, e.g. "Aarav Shah (White) clock". */
  label: string;
  /** It is this side's turn in a live game. */
  active: boolean;
  gameOver?: boolean;
  announce?: boolean;
  className?: string;
}) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(id);
  }, [running]);

  const shown = running ? Math.max(0, ms - Math.max(0, now - receivedAt)) : ms;
  const flagged = shown <= 0;
  const low = shown < LOW_MS;

  const tone = flagged
    ? "bg-danger text-white line-through decoration-2"
    : gameOver
      ? "bg-surface-inset text-foreground"
      : active && low
        ? "bg-danger text-white animate-clock-breathe"
        : active
          ? "bg-primary text-primary-foreground shadow-cta"
          : low
            ? "bg-danger-soft text-danger"
            : "bg-surface-inset text-muted-foreground";

  return (
    <>
    <div
      role="timer"
      aria-label={label}
      data-state={flagged ? "flagged" : gameOver ? "over" : active ? (low ? "low" : "active") : low ? "low-idle" : "idle"}
      className={cn(
        "relative ml-auto inline-flex h-11 min-w-[96px] shrink-0 items-center justify-end gap-1.5 rounded-xl px-3 font-mono text-[26px] leading-none font-bold tabular-nums transition-colors duration-150 sm:h-12 sm:min-w-[112px] sm:text-clock",
        tone,
        className,
      )}
    >
      {low && !flagged && !gameOver && active && <Timer className="size-4 shrink-0" aria-hidden />}
      <span>{formatClock(shown)}</span>
      {active && !low && !gameOver && (
        <span aria-hidden className="absolute inset-x-3 bottom-1 h-[3px] animate-live-pulse rounded-full bg-brand-orange" />
      )}
    </div>
      {announce && (
        <span className="sr-only" aria-live="assertive">
          {low && running && !flagged ? "20 seconds left" : ""}
        </span>
      )}
    </>
  );
}
