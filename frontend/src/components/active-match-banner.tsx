"use client";

import { Swords } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useActiveMatch } from "@/lib/queries";

/** Shown to students who have a game in progress (e.g. after a refresh or closing the tab). */
export function ActiveMatchBanner() {
  const q = useActiveMatch();
  if (!q.data?.matchId) return null;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-orange-300 bg-orange-50 px-4 py-3 dark:border-orange-900 dark:bg-orange-950/40">
      <div className="flex items-center gap-2 font-medium">
        <Swords className="size-4 text-orange-600" /> You have a game in progress — your clock may be running!
      </div>
      <Button asChild size="sm" className="bg-orange-600 hover:bg-orange-700">
        <Link href={`/matches/${q.data.matchId}`}>Resume game</Link>
      </Button>
    </div>
  );
}
