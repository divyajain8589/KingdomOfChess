"use client";

import { useEffect, useState } from "react";
import { formatClock } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Displays server time minus what's elapsed locally since the snapshot arrived. Using our own
 * receive time (not the server's timestamp) makes it immune to clock skew between machines.
 * The display is cosmetic — the server decides when a flag falls.
 */
export function ChessClock({
  ms,
  running,
  receivedAt,
  name,
  sub,
  active,
}: {
  ms: number;
  running: boolean;
  receivedAt: number;
  name: string;
  sub?: string;
  active: boolean;
}) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(id);
  }, [running]);

  const shown = running ? Math.max(0, ms - Math.max(0, now - receivedAt)) : ms;
  const low = shown < 20_000;

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 rounded-lg border px-3 py-2 transition-colors",
        active ? "border-primary bg-primary/5" : "bg-card",
      )}
    >
      <div className="min-w-0">
        <div className="truncate font-medium">{name}</div>
        {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
      </div>
      <div
        className={cn(
          "rounded-md px-3 py-1 font-mono text-2xl font-semibold tabular-nums",
          running ? (low ? "bg-destructive text-white" : "bg-primary text-primary-foreground") : "bg-muted text-muted-foreground",
        )}
        role="timer"
        aria-label={`${name} clock`}
      >
        {formatClock(shown)}
      </div>
    </div>
  );
}
