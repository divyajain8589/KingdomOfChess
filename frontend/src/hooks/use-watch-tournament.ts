"use client";

import { emitAck, getSocket } from "@/lib/socket";
import { useEffect } from "react";
import { useOnSocketConnect } from "./use-socket-event";

/** Join the tournament's room so leaderboard/match lists refresh live (handled in SocketProvider). */
export function useWatchTournament(tournamentId: string) {
  useOnSocketConnect(() => {
    emitAck("tournament:watch", { tournamentId }).catch(() => {
      // Non-fatal: the page still works, it just won't auto-refresh.
    });
  }, [tournamentId]);

  useEffect(
    () => () => {
      if (getSocket().connected) emitAck("tournament:unwatch", { tournamentId }).catch(() => {});
    },
    [tournamentId],
  );
}
