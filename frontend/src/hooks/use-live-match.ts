"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Chess } from "chess.js";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { errorMessage } from "@/lib/api";
import { qk, useMatch } from "@/lib/queries";
import { emitAck, getSocket } from "@/lib/socket";
import type { MatchState } from "@/lib/types";
import { useOnSocketConnect, useSocketEvent } from "./use-socket-event";

interface Snapshot {
  state: MatchState;
  receivedAt: number;
}

/** Prefer the snapshot further into the game; on a tie, a finished one; then the most recent. */
function newest(a: Snapshot | null, b: Snapshot | null): Snapshot | null {
  if (!a || !b) return a ?? b;
  if (a.state.moves.length !== b.state.moves.length) return a.state.moves.length > b.state.moves.length ? a : b;
  if (a.state.status !== b.state.status) return a.state.status === "completed" ? a : b;
  return a.receivedAt >= b.receivedAt ? a : b;
}

export interface LiveMatch {
  state: MatchState | undefined;
  /** Date.now() when `state` arrived — clocks count down from there. */
  receivedAt: number;
  /** FEN to show while a move is in flight (optimistic), else null. */
  pendingFen: string | null;
  isLoading: boolean;
  error: unknown;
  refetch: () => void;
  move: (from: string, to: string, promotion?: string) => boolean;
  resign: () => Promise<void>;
  offerDraw: () => Promise<void>;
  respondDraw: (accept: boolean) => Promise<void>;
}

/**
 * The server owns the game. This hook:
 *  1. loads the state over REST (for proper loading/error states and deep links),
 *  2. joins the match room over Socket.IO (again after every reconnect) and replaces local state
 *     with every `match:state` push — so both boards always converge on the server's version,
 *  3. applies our own moves optimistically (validated locally with chess.js for snappy UX) and
 *     rolls back if the server rejects them.
 */
export function useLiveMatch(matchId: string): LiveMatch {
  const q = useMatch(matchId);
  const qc = useQueryClient();
  const [pushed, setPushed] = useState<Snapshot | null>(null);
  const [pendingFen, setPendingFen] = useState<string | null>(null);

  const accept = useCallback(
    (s: MatchState) => {
      setPushed((prev) => newest(prev, { state: s, receivedAt: Date.now() }));
      setPendingFen(null);
      if (s.status === "completed") {
        qc.invalidateQueries({ queryKey: qk.activeMatch });
        qc.invalidateQueries({ queryKey: qk.tournament(s.tournamentId) });
      }
    },
    [qc],
  );

  useOnSocketConnect(() => {
    emitAck<MatchState>("match:join", { matchId })
      .then(accept)
      .catch((err) => toast.error(errorMessage(err)));
  }, [matchId]);

  useEffect(
    () => () => {
      if (getSocket().connected) emitAck("match:leave", { matchId }).catch(() => {});
    },
    [matchId],
  );

  useSocketEvent<MatchState>("match:state", (s) => {
    if (s.matchId === matchId) accept(s);
  });

  // Whichever is newer: the REST snapshot (first load, refetch on focus) or the latest socket push.
  const live = newest(pushed, q.data ? { state: q.data, receivedAt: q.dataUpdatedAt } : null);
  const state = live?.state;

  const move = useCallback(
    (from: string, to: string, promotion = "q") => {
      if (!state || state.status !== "ongoing") return false;
      // Local pre-check only for responsiveness; the server re-validates everything.
      const local = new Chess(state.fen);
      try {
        local.move({ from, to, promotion });
      } catch {
        return false;
      }
      setPendingFen(local.fen());
      emitAck<MatchState>("match:move", { matchId, from, to, promotion })
        .then(accept)
        .catch((err) => {
          setPendingFen(null); // roll back to the server's position
          toast.error(errorMessage(err));
        });
      return true;
    },
    [state, matchId, accept],
  );

  const action = useCallback(
    async (event: string, payload: object = {}) => {
      try {
        accept(await emitAck<MatchState>(event, { matchId, ...payload }));
      } catch (err) {
        toast.error(errorMessage(err));
      }
    },
    [matchId, accept],
  );

  return {
    state,
    receivedAt: live?.receivedAt ?? 0,
    pendingFen,
    isLoading: !state && q.isPending,
    error: !state ? q.error : null,
    refetch: () => q.refetch(),
    move,
    resign: () => action("match:resign"),
    offerDraw: () => action("match:offer-draw"),
    respondDraw: (accept: boolean) => action("match:respond-draw", { accept }),
  };
}
