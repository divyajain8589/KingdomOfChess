"use client";

import { ChevronFirst, ChevronLast, ChevronLeft, ChevronRight, Copy } from "lucide-react";
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * PGN panel: numbered move pairs, click any move to review that position (index = plies played).
 * `viewPly === null` means "following the live position".
 */
export function MoveList({
  moves,
  pgn,
  viewPly,
  onView,
}: {
  moves: string[];
  pgn: string;
  viewPly: number | null;
  onView: (ply: number | null) => void;
}) {
  const current = viewPly ?? moves.length;
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (viewPly === null) endRef.current?.scrollIntoView({ block: "nearest" });
  }, [moves.length, viewPly]);

  const go = (ply: number) => onView(ply >= moves.length ? null : Math.max(0, ply));

  const rows = [];
  for (let i = 0; i < moves.length; i += 2) rows.push({ n: i / 2 + 1, w: i, b: i + 1 });

  const cell = (ply: number) =>
    ply < moves.length && (
      <button
        type="button"
        onClick={() => go(ply + 1)}
        className={cn(
          "rounded px-1.5 py-0.5 text-left font-mono hover:bg-muted",
          current === ply + 1 && "bg-primary text-primary-foreground hover:bg-primary",
        )}
      >
        {moves[ply]}
      </button>
    );

  return (
    <div className="flex flex-col gap-2">
      <div className="h-56 overflow-y-auto rounded-lg border bg-card p-2 text-sm lg:h-72">
        {moves.length === 0 ? (
          <p className="p-2 text-muted-foreground">No moves yet. White to play.</p>
        ) : (
          <div className="grid grid-cols-[2.5rem_1fr_1fr] gap-y-0.5">
            {rows.map((r) => (
              <div key={r.n} className="contents">
                <span className="py-0.5 text-muted-foreground">{r.n}.</span>
                {cell(r.w)}
                {cell(r.b) || <span />}
              </div>
            ))}
          </div>
        )}
        <div ref={endRef} />
      </div>
      <div className="flex items-center justify-between">
        <div className="flex gap-1">
          <Button variant="outline" size="icon-sm" aria-label="First move" onClick={() => go(0)} disabled={current === 0}>
            <ChevronFirst />
          </Button>
          <Button variant="outline" size="icon-sm" aria-label="Previous move" onClick={() => go(current - 1)} disabled={current === 0}>
            <ChevronLeft />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="Next move"
            onClick={() => go(current + 1)}
            disabled={current >= moves.length}
          >
            <ChevronRight />
          </Button>
          <Button variant="outline" size="icon-sm" aria-label="Latest position" onClick={() => onView(null)} disabled={viewPly === null}>
            <ChevronLast />
          </Button>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() =>
            navigator.clipboard.writeText(pgn).then(
              () => toast.success("PGN copied"),
              () => toast.error("Couldn't copy to clipboard"),
            )
          }
        >
          <Copy /> Copy PGN
        </Button>
      </div>
    </div>
  );
}
