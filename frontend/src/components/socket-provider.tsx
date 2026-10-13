"use client";

import { useQueryClient } from "@tanstack/react-query";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useRef, useSyncExternalStore } from "react";
import { toast } from "sonner";
import { qk, useMe } from "@/lib/queries";
import { getSocket } from "@/lib/socket";

type ConnectionState = "idle" | "connecting" | "connected" | "disconnected";

const SocketContext = createContext<ConnectionState>("idle");

function subscribeConnection(onChange: () => void) {
  const s = getSocket();
  const events = ["connect", "disconnect", "connect_error"] as const;
  events.forEach((e) => s.on(e, onChange));
  s.io.on("reconnect_attempt", onChange);
  return () => {
    events.forEach((e) => s.off(e, onChange));
    s.io.off("reconnect_attempt", onChange);
  };
}

function connectionSnapshot(): ConnectionState {
  const s = getSocket();
  // `active` = connected or still trying to (auto-reconnect).
  return s.connected ? "connected" : s.active ? "connecting" : "idle";
}
export const useConnectionState = () => useContext(SocketContext);

/**
 * Opens the Socket.IO connection once we know who's logged in and handles app-wide pushes:
 *  - match:found → toast + jump straight into the game (no refresh needed)
 *  - tournament:updated → refetch anything about that tournament
 */
export function SocketProvider({ children }: { children: React.ReactNode }) {
  const { data: me } = useMe();
  const qc = useQueryClient();
  const router = useRouter();
  const pathname = usePathname();
  const pathRef = useRef(pathname);
  const state = useSyncExternalStore(subscribeConnection, connectionSnapshot, () => "idle" as const);

  useEffect(() => {
    pathRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    if (!me) return;
    const s = getSocket();

    const onConnectError = (err: Error) => {
      // Session expired: full reload to the login page drops all cached state.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      if (err.message === "UNAUTHORIZED") window.location.href = "/login";
    };
    const onMatchFound = ({ matchId }: { matchId: string }) => {
      qc.invalidateQueries({ queryKey: qk.activeMatch });
      qc.invalidateQueries({ queryKey: qk.schedule });
      if (pathRef.current !== `/matches/${matchId}`) {
        toast.success("Opponent found — game on!");
        router.push(`/matches/${matchId}`);
      }
    };
    const onTournamentUpdated = ({ tournamentId }: { tournamentId: string }) => {
      qc.invalidateQueries({ queryKey: qk.tournament(tournamentId) });
      qc.invalidateQueries({ queryKey: qk.tournamentsAll });
      qc.invalidateQueries({ queryKey: qk.schedule });
      qc.invalidateQueries({ queryKey: ["me", "matches"] });
      // Emitted after the result is committed, so this clears a finished game's "Resume" button.
      qc.invalidateQueries({ queryKey: qk.activeMatch });
    };

    s.on("connect_error", onConnectError);
    s.on("match:found", onMatchFound);
    s.on("tournament:updated", onTournamentUpdated);
    if (!s.connected) s.connect();

    return () => {
      s.off("connect_error", onConnectError);
      s.off("match:found", onMatchFound);
      s.off("tournament:updated", onTournamentUpdated);
    };
  }, [me, qc, router]);

  return <SocketContext.Provider value={state}>{children}</SocketContext.Provider>;
}
