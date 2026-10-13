"use client";

import { Loader2, Swords, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { useConnectionState } from "@/components/socket-provider";
import { Button } from "@/components/ui/button";
import { useOnSocketConnect, useSocketEvent } from "@/hooks/use-socket-event";
import { errorMessage } from "@/lib/api";
import { useActiveMatch } from "@/lib/queries";
import { emitAck } from "@/lib/socket";
import type { MatchState, QueueStatus } from "@/lib/types";

/**
 * "Find opponent" button + waiting state. When the server pairs us it pushes `match:found`,
 * which SocketProvider turns into a navigation to the board — on whatever page we're on.
 */
export function FindOpponent({ tournamentId, size = "lg" }: { tournamentId: string; size?: "default" | "lg" }) {
  const [status, setStatus] = useState<QueueStatus | null>(null);
  const [pending, setPending] = useState(false);
  const conn = useConnectionState();
  const active = useActiveMatch();

  // Sync on mount and after reconnects (the server drops you from the queue if you disconnect).
  useOnSocketConnect(() => {
    emitAck<QueueStatus>("queue:status", { tournamentId }).then(setStatus).catch(() => {});
  }, [tournamentId]);

  useSocketEvent<QueueStatus>("queue:status", (s) => {
    if (s.tournamentId === tournamentId) setStatus(s);
  });
  useSocketEvent("disconnect", () => setStatus((s) => (s ? { ...s, queued: false } : s)));

  async function join() {
    setPending(true);
    try {
      const r = await emitAck<{ queue: QueueStatus; match: MatchState | null }>("queue:join", { tournamentId });
      setStatus(r.queue);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setPending(false);
    }
  }

  async function leave() {
    setPending(true);
    try {
      setStatus(await emitAck<QueueStatus>("queue:leave", { tournamentId }));
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setPending(false);
    }
  }

  if (active.data?.matchId) {
    return (
      <Button asChild size={size} className="bg-orange-600 hover:bg-orange-700">
        <Link href={`/matches/${active.data.matchId}`}>
          <Swords /> Resume your game
        </Link>
      </Button>
    );
  }

  if (status?.queued) {
    return (
      <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-muted/50 px-4 py-2.5">
        <Loader2 className="size-4 animate-spin text-primary" />
        <div className="text-sm">
          <div className="font-medium">Looking for an opponent…</div>
          <div className="text-xs text-muted-foreground">
            {status.waiting > 1 ? `${status.waiting} players waiting` : "You'll be paired as soon as someone eligible joins."}
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={leave} disabled={pending}>
          <X /> Cancel
        </Button>
      </div>
    );
  }

  return (
    <Button size={size} onClick={join} disabled={pending || conn !== "connected"}>
      {pending ? <Loader2 className="animate-spin" /> : <Swords />}
      {conn === "connected" ? "Find opponent" : "Connecting…"}
    </Button>
  );
}
