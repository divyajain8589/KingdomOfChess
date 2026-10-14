"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useActiveMatch } from "@/lib/queries";
import { cn } from "@/lib/utils";

/** Night strip shown to students with a game in progress (after a refresh or closing the tab). Renders nothing otherwise. */
export function ActiveMatchBanner({ className }: { className?: string }) {
  const q = useActiveMatch();
  if (!q.data?.matchId) return null;
  return (
    <section
      aria-label="Game in progress"
      className={cn(
        "checker flex flex-col gap-4 rounded-2xl bg-surface-night p-4 text-primary-foreground shadow-raised [--checker-color:oklch(1_0_0/0.05)] sm:flex-row sm:items-center sm:p-5",
        className,
      )}
    >
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <span aria-hidden className="relative mt-1.5 flex size-2.5 shrink-0">
          <span className="absolute inset-0 animate-ping rounded-full bg-brand-orange opacity-60 motion-reduce:hidden" />
          <span className="relative size-2.5 rounded-full bg-brand-orange" />
        </span>
        <div className="min-w-0">
          <p className="text-[16px] font-extrabold">Your game is still on!</p>
          <p className="text-[14px] text-primary-foreground/75">Your clock might be ticking. Jump back in.</p>
        </div>
      </div>
      <Button asChild variant="play" size="lg" className="w-full focus-visible:ring-offset-surface-night sm:w-auto">
        <Link href={`/matches/${q.data.matchId}`}>
          Resume game <ArrowRight data-icon="inline-end" />
        </Link>
      </Button>
    </section>
  );
}
