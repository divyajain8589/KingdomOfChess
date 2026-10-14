import { cn } from "@/lib/utils";

export type Outcome = "win" | "draw" | "loss";

const CHIP: Record<Outcome, { letter: string; word: string; className: string }> = {
  win: { letter: "W", word: "Win", className: "bg-win-soft text-win" },
  draw: { letter: "D", word: "Draw", className: "bg-draw-soft text-draw" },
  loss: { letter: "L", word: "Loss", className: "bg-loss-soft text-loss" },
};

/** W / D / L square (32px) from the viewer's perspective, with the full word for screen readers. Pass `outcomeFor(...)` from lib/format. */
export function ResultChip({ outcome, className }: { outcome: Outcome; className?: string }) {
  const c = CHIP[outcome];
  return (
    <span
      className={cn(
        "inline-grid size-8 shrink-0 place-items-center rounded-lg text-[14px] font-extrabold",
        c.className,
        className,
      )}
    >
      <span aria-hidden>{c.letter}</span>
      <span className="sr-only">{c.word}</span>
    </span>
  );
}
