"use client";

import { ChevronFirst, ChevronLast, ChevronLeft, ChevronRight, Copy, ListOrdered } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/** "Qh4#" → { text: "Qh4", mark: "#" } so check/mate render as badges. */
function splitSan(san: string): { text: string; mark: "+" | "#" | null } {
  if (san.endsWith("#")) return { text: san.slice(0, -1), mark: "#" };
  if (san.endsWith("+")) return { text: san.slice(0, -1), mark: "+" };
  return { text: san, mark: null };
}

function SanText({ san, current }: { san: string; current: boolean }) {
  const { text, mark } = splitSan(san);
  return (
    <>
      {text}
      {mark && (
        <span
          className={cn(
            "ml-0.5 font-extrabold",
            mark === "#" ? (current ? "text-white" : "text-danger") : current ? "text-primary-foreground/80" : "text-muted-foreground",
          )}
        >
          <span aria-hidden>{mark}</span>
          <span className="sr-only">{mark === "#" ? " checkmate" : " check"}</span>
        </span>
      )}
    </>
  );
}

/** Keyboard shortcuts shouldn't fire while typing or inside a dialog. */
function shouldIgnoreKey(e: KeyboardEvent) {
  if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return true;
  const t = e.target as HTMLElement | null;
  if (!t) return false;
  if (t.closest("input, textarea, select, [contenteditable=true], [role=dialog], [role=alertdialog]")) return true;
  return false;
}

/**
 * Moves panel: numbered pairs, click any move to review that position (index = plies played).
 * `viewPly === null` means "following the live position". ← → Home End step through moves.
 * Below `lg` it shows a horizontal strip first, with an "All moves" toggle for the full grid.
 */
export function MoveList({
  moves,
  pgn,
  viewPly,
  onView,
  className,
}: {
  moves: string[];
  pgn: string;
  viewPly: number | null;
  onView: (ply: number | null) => void;
  className?: string;
}) {
  const current = viewPly ?? moves.length;
  const gridRef = useRef<HTMLDivElement>(null);
  const stripRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);

  const go = (ply: number) => onView(ply >= moves.length ? null : Math.max(0, ply));

  // Keep the current move in view inside each scroller, without scrolling the page. Re-runs when a
  // scroller changes size (e.g. the strip goes from display:none to visible on a viewport change).
  useEffect(() => {
    const sync = () => {
      const grid = gridRef.current;
      if (grid) {
        const el = grid.querySelector<HTMLElement>("[data-current=true]");
        if (viewPly === null || !el) grid.scrollTop = grid.scrollHeight;
        else if (el.offsetTop < grid.scrollTop || el.offsetTop + el.offsetHeight > grid.scrollTop + grid.clientHeight)
          grid.scrollTop = el.offsetTop - grid.clientHeight / 2;
      }
      const strip = stripRef.current;
      if (strip) {
        const el = strip.querySelector<HTMLElement>("[data-current=true]");
        if (viewPly === null || !el) strip.scrollLeft = strip.scrollWidth;
        else strip.scrollLeft = el.offsetLeft - strip.clientWidth / 2 + el.offsetWidth / 2;
      }
    };
    sync();
    const ro = new ResizeObserver(sync);
    if (gridRef.current) ro.observe(gridRef.current);
    if (stripRef.current) ro.observe(stripRef.current);
    return () => ro.disconnect();
  }, [moves.length, viewPly, expanded]);

  // ← → Home End anywhere on the page (not while typing or in a dialog).
  const keyState = useRef({ current, total: moves.length, go, onView });
  useEffect(() => {
    keyState.current = { current, total: moves.length, go, onView };
  });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (shouldIgnoreKey(e)) return;
      const { current, total, go, onView } = keyState.current;
      if (total === 0) return;
      if (e.key === "ArrowLeft") go(current - 1);
      else if (e.key === "ArrowRight") go(current + 1);
      else if (e.key === "Home") go(0);
      else if (e.key === "End") onView(null);
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const rows: { n: number; w: number; b: number }[] = [];
  for (let i = 0; i < moves.length; i += 2) rows.push({ n: i / 2 + 1, w: i, b: i + 1 });

  const cell = (ply: number) => {
    if (ply >= moves.length) return <span />;
    const isCurrent = current === ply + 1;
    return (
      <button
        type="button"
        data-current={isCurrent}
        aria-current={isCurrent ? "step" : undefined}
        aria-label={`${Math.floor(ply / 2) + 1}${ply % 2 ? "…" : "."} ${moves[ply]}`}
        onClick={() => go(ply + 1)}
        className={cn(
          "focus-ring h-8 rounded-md px-2 text-left font-mono text-[14px] font-semibold transition-colors duration-100",
          isCurrent ? "bg-primary text-primary-foreground" : "hover:bg-surface-inset",
        )}
      >
        <SanText san={moves[ply]} current={isCurrent} />
      </button>
    );
  };

  const empty = moves.length === 0;
  const moveNo = Math.ceil(moves.length / 2);

  return (
    <Card className={cn("gap-0 py-0", className)}>
      <div className="flex items-center justify-between gap-3 px-5 pt-4 pb-3">
        <p className="eyebrow">— Moves</p>
        <div className="flex items-center gap-2">
          {!empty && <span className="font-mono text-[12px] font-bold text-muted-foreground tabular-nums">Move {moveNo}</span>}
          {!empty && (
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden"
              aria-expanded={expanded}
              onClick={() => setExpanded((v) => !v)}
            >
              <ListOrdered /> {expanded ? "Hide list" : "All moves"}
            </Button>
          )}
        </div>
      </div>

      {empty ? (
        <p className="mx-5 mb-4 rounded-xl bg-surface-raised px-4 py-6 text-center text-[14px] text-muted-foreground">
          No moves yet. White starts!
        </p>
      ) : (
        <>
          {/* Mobile: horizontal strip of numbered chips. */}
          {!expanded && (
            <div
              ref={stripRef}
              className="relative flex gap-1 overflow-x-auto px-5 pb-3 [scrollbar-width:none] lg:hidden"
              aria-label="Moves"
            >
              {moves.map((san, ply) => {
                const isCurrent = current === ply + 1;
                return (
                  <button
                    key={ply}
                    type="button"
                    data-current={isCurrent}
                    aria-current={isCurrent ? "step" : undefined}
                    onClick={() => go(ply + 1)}
                    className={cn(
                      "focus-ring inline-flex h-9 shrink-0 items-center gap-1 rounded-lg px-2.5 font-mono text-[14px] font-semibold",
                      isCurrent ? "bg-primary text-primary-foreground" : "bg-surface-inset hover:bg-surface-inset-strong",
                    )}
                  >
                    {ply % 2 === 0 && (
                      <span className={cn("text-[12px]", isCurrent ? "text-primary-foreground/70" : "text-muted-foreground")}>
                        {ply / 2 + 1}.
                      </span>
                    )}
                    <SanText san={san} current={isCurrent} />
                  </button>
                );
              })}
            </div>
          )}

          {/* Desktop (and expanded mobile): the scoresheet grid. */}
          <div
            ref={gridRef}
            className={cn(
              "relative h-64 min-h-56 overflow-y-auto border-y border-border lg:h-[calc(100dvh-30rem)]",
              expanded ? "block" : "hidden lg:block",
            )}
          >
            <div className="grid grid-cols-[2.25rem_1fr_1fr]">
              {rows.map((r) => (
                <div key={r.n} className="col-span-3 grid grid-cols-subgrid items-center px-2 py-0.5 odd:bg-surface-raised">
                  <span className="pl-1 font-mono text-[13px] text-muted-foreground tabular-nums">{r.n}.</span>
                  {cell(r.w)}
                  {cell(r.b)}
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      <div className={cn("flex items-center justify-between gap-2 px-5 py-3", empty && "border-t border-border")}>
        <div className="flex gap-1.5">
          <Button variant="outline" size="icon" aria-label="First move" onClick={() => go(0)} disabled={current === 0}>
            <ChevronFirst />
          </Button>
          <Button variant="outline" size="icon" aria-label="Previous move" onClick={() => go(current - 1)} disabled={current === 0}>
            <ChevronLeft />
          </Button>
          <Button variant="outline" size="icon" aria-label="Next move" onClick={() => go(current + 1)} disabled={current >= moves.length}>
            <ChevronRight />
          </Button>
          <Button variant="outline" size="icon" aria-label="Latest position" onClick={() => onView(null)} disabled={viewPly === null}>
            <ChevronLast />
          </Button>
        </div>
        <Button
          variant="ghost"
          size="sm"
          disabled={empty}
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
    </Card>
  );
}
