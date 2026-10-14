"use client";

import { ArrowRight, Swords, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { toast } from "sonner";
import { useConnectionState } from "@/components/socket-provider";
import { Piece } from "@/components/states";
import { Button } from "@/components/ui/button";
import { useOnSocketConnect, useSocketEvent } from "@/hooks/use-socket-event";
import { errorMessage } from "@/lib/api";
import { useActiveMatch } from "@/lib/queries";
import { emitAck } from "@/lib/socket";
import type { MatchState, QueueStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

type Size = "default" | "lg" | "xl";
type Tone = "default" | "onNight";

/**
 * "Find an opponent" CTA + matchmaking state. When the server pairs us it pushes `match:found`,
 * which SocketProvider turns into a toast and a navigation to the board, on whatever page we're on.
 *
 * - `tone="onNight"`: rendered inside a navy `Card variant="night"` (no panel of its own while searching).
 * - `tone="default"`: on paper/white cards; the searching state brings its own small night panel.
 * - `onQueuedChange` lets a parent swap its own heading out while the search is running.
 */
export function FindOpponent({
  tournamentId,
  size = "lg",
  tone = "default",
  className,
  onQueuedChange,
}: {
  tournamentId: string;
  size?: Size;
  tone?: Tone;
  className?: string;
  onQueuedChange?: (queued: boolean) => void;
}) {
  const [status, setStatus] = useState<QueueStatus | null>(null);
  const [queuedAt, setQueuedAt] = useState<number | null>(null);
  const [pending, setPending] = useState(false);
  const [found, setFound] = useState(false);
  const conn = useConnectionState();
  const active = useActiveMatch();

  function apply(s: QueueStatus) {
    setStatus(s);
    setQueuedAt((at) => (s.queued ? (at ?? Date.now()) : null));
    onQueuedChange?.(s.queued);
  }

  // Sync on mount and after reconnects (the server drops you from the queue if you disconnect).
  useOnSocketConnect(() => {
    emitAck<QueueStatus>("queue:status", { tournamentId }).then(apply).catch(() => {});
  }, [tournamentId]);

  useSocketEvent<QueueStatus>("queue:status", (s) => {
    if (s.tournamentId === tournamentId) apply(s);
  });
  useSocketEvent("disconnect", () => {
    setStatus((s) => (s ? { ...s, queued: false } : s));
    setQueuedAt(null);
    onQueuedChange?.(false);
  });
  // SocketProvider navigates; we just flash the panel for the moment it takes.
  useSocketEvent("match:found", () => {
    if (status?.queued) setFound(true);
  });

  async function join() {
    setPending(true);
    try {
      const r = await emitAck<{ queue: QueueStatus; match: MatchState | null }>("queue:join", { tournamentId });
      apply(r.queue);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setPending(false);
    }
  }

  async function leave() {
    setPending(true);
    try {
      apply(await emitAck<QueueStatus>("queue:leave", { tournamentId }));
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setPending(false);
    }
  }

  const onNightFocus = tone === "onNight" && "focus-visible:ring-offset-surface-night";

  if (active.data?.matchId) {
    return (
      <Button asChild variant="play" size={size} className={cn(onNightFocus, className)}>
        <Link href={`/matches/${active.data.matchId}`}>
          <Swords /> Resume your game <ArrowRight data-icon="inline-end" />
        </Link>
      </Button>
    );
  }

  if (status?.queued) {
    return (
      <Searching
        tone={tone}
        waiting={status.waiting}
        since={queuedAt}
        found={found}
        pending={pending}
        onStop={leave}
        className={className}
      />
    );
  }

  const connected = conn === "connected";
  return (
    <Button
      variant="play"
      size={size}
      onClick={join}
      loading={pending || !connected}
      className={cn(onNightFocus, className)}
    >
      <Swords />
      {connected ? "Find an opponent" : "Connecting…"}
    </Button>
  );
}

/* ---------------------------------------------------------------- matchmaking state */

const TIPS = ["Tip: control the centre early!", "Tip: check, capture, threat, in that order."];

function Searching({
  tone,
  waiting,
  since,
  found,
  pending,
  onStop,
  className,
}: {
  tone: Tone;
  waiting: number;
  since: number | null;
  found: boolean;
  pending: boolean;
  onStop: () => void;
  className?: string;
}) {
  const [mountedAt] = useState(() => Date.now());
  const [now, setNow] = useState(mountedAt);
  const origin = since ?? mountedAt;
  const [lineIdx, setLineIdx] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    const id = setInterval(() => setLineIdx((i) => i + 1), 4000);
    return () => clearInterval(id);
  }, []);

  const others = waiting - 1;
  const lines = [
    "Looking for someone you haven't played yet.",
    ...(others > 0 ? [`${others} other ${others === 1 ? "player is" : "players are"} looking too.`] : []),
    ...TIPS,
  ];
  const line = lines[lineIdx % lines.length];
  const secs = Math.max(0, Math.floor((now - origin) / 1000));
  const elapsed = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}`;

  return (
    <div
      className={cn(
        "flex w-full flex-col items-center gap-4 rounded-2xl text-center text-primary-foreground transition-colors duration-300 sm:flex-row sm:gap-6 sm:text-left",
        tone === "default" &&
          "checker bg-surface-night p-5 shadow-raised [--checker-color:oklch(1_0_0/0.045)] [--checker-size:32px]",
        found && "bg-brand-orange text-brand-orange-foreground",
        className,
      )}
    >
      <KnightBoard />
      <div className="min-w-0 flex-1 space-y-1.5">
        <p aria-live="polite" className="text-h3 font-extrabold sm:text-h2">
          {found ? "Opponent found!" : "Finding your opponent…"}
        </p>
        <p className="min-h-[1.45em] text-[14px] text-primary-foreground/75">{line}</p>
        <p className="font-mono text-[13px] text-primary-foreground/60 tabular-nums">
          <span className="sr-only">Searching for </span>
          {elapsed}
        </p>
      </div>
      <Button
        variant="onNight"
        size="lg"
        onClick={onStop}
        loading={pending}
        className="w-full shrink-0 focus-visible:ring-offset-surface-night sm:w-auto"
      >
        <X /> Stop searching
      </Button>
    </div>
  );
}

/* A knight touring the 3x3 board along its 8-square L-cycle; a still knight + ellipsis under reduced motion. */

const TOUR: [number, number][] = [
  [0, 0],
  [1, 2],
  [2, 0],
  [0, 1],
  [2, 2],
  [1, 0],
  [0, 2],
  [2, 1],
];

const reducedMotionQuery = "(prefers-reduced-motion: reduce)";
function subscribeReducedMotion(cb: () => void) {
  const mq = window.matchMedia(reducedMotionQuery);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}
const useReducedMotion = () =>
  useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia(reducedMotionQuery).matches,
    () => false,
  );

function KnightBoard() {
  const reduced = useReducedMotion();
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (reduced) return;
    const id = setInterval(() => setStep((s) => s + 1), 800);
    return () => clearInterval(id);
  }, [reduced]);

  const [col, row] = reduced ? [1, 1] : TOUR[step % TOUR.length];

  return (
    <div aria-hidden className="relative shrink-0">
      <div className="grid size-32 grid-cols-3 overflow-hidden rounded-xl ring-4 ring-white/10">
        {Array.from({ length: 9 }).map((_, i) => (
          <span
            key={i}
            className={(Math.floor(i / 3) + (i % 3)) % 2 === 0 ? "bg-board-light" : "bg-board-dark"}
          />
        ))}
      </div>
      <div
        className="absolute top-0 left-0 grid size-[33.333%] place-items-center transition-transform duration-500 ease-spring"
        style={{ transform: `translate(${col * 100}%, ${row * 100}%)` }}
      >
        <span key={step} className="block animate-[knight-hop_0.8s_ease-in-out]">
          <Piece code="wN" className="size-10 drop-shadow-[0_3px_3px_oklch(0.248_0.049_253.4/0.35)]" />
        </span>
      </div>
      {reduced && (
        <span className="absolute inset-x-0 -bottom-5 flex justify-center gap-1">
          {[0, 1, 2].map((i) => (
            <span key={i} className="size-1.5 rounded-full bg-primary-foreground/60" />
          ))}
        </span>
      )}
    </div>
  );
}
