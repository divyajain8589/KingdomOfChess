import { Eye, History, Loader2, MousePointerClick, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Color } from "@/lib/types";
import { cn } from "@/lib/utils";

export type TurnBannerMode =
  | { kind: "my-turn" }
  | { kind: "my-check" }
  | { kind: "thinking"; opponent: string }
  | { kind: "their-check"; opponent: string }
  | { kind: "sending" }
  | { kind: "spectating"; turn: Color; check: boolean }
  | { kind: "reviewing"; ply: number; total: number; live: boolean; onBack: () => void };

function ThinkingDots() {
  return (
    <span aria-hidden className="inline-flex items-center gap-1">
      {[0, 200, 400].map((d) => (
        <span key={d} className="size-1.5 animate-live-pulse rounded-full bg-current" style={{ animationDelay: `${d}ms` }} />
      ))}
    </span>
  );
}

/** The one-line "whose move is it" banner. Announces politely to screen readers. */
export function TurnBanner({ mode, className }: { mode: TurnBannerMode; className?: string }) {
  const base =
    "flex min-h-14 items-center justify-center gap-2.5 rounded-2xl px-4 py-2 text-center text-[17px] leading-tight font-extrabold sm:text-[18px]";

  let body: React.ReactNode;
  let tone: string;
  switch (mode.kind) {
    case "my-turn":
      tone = "bg-brand-orange text-brand-orange-foreground shadow-cta-orange animate-in zoom-in-95 duration-300 ease-spring";
      body = (
        <>
          <MousePointerClick className="size-5" aria-hidden /> Your move!
        </>
      );
      break;
    case "my-check":
      tone = "bg-danger text-white animate-in zoom-in-95 duration-300 ease-spring";
      body = (
        <>
          <ShieldAlert className="size-5" aria-hidden /> Check! Protect your king.
        </>
      );
      break;
    case "thinking":
      tone = "bg-surface-inset text-muted-foreground";
      body = (
        <>
          <span className="truncate">{mode.opponent} is thinking</span>
          <ThinkingDots />
        </>
      );
      break;
    case "their-check":
      tone = "bg-surface-inset text-foreground";
      body = <span>Check! {mode.opponent} must save their king.</span>;
      break;
    case "sending":
      tone = "bg-surface-inset text-muted-foreground";
      body = (
        <>
          <Loader2 className="size-4 animate-spin" aria-hidden /> Sending your move…
        </>
      );
      break;
    case "spectating":
      tone = "bg-info-soft text-info";
      body = (
        <>
          <Eye className="size-5" aria-hidden />
          <span
            aria-hidden
            className={cn(
              "size-3.5 rounded-full ring-1 ring-border-strong",
              mode.turn === "white" ? "bg-white" : "bg-foreground",
            )}
          />
          {mode.turn === "white" ? "White" : "Black"} to move{mode.check ? " · Check!" : ""}
        </>
      );
      break;
    case "reviewing":
      tone = "bg-warning-soft text-warning justify-between gap-2 px-3 text-[15px] sm:text-[15px]";
      body = (
        <>
          <span className="flex min-w-0 items-center gap-2">
            <History className="size-4 shrink-0" aria-hidden />
            {mode.ply === 0 ? (
              <span className="whitespace-nowrap">Start position</span>
            ) : (
              <span className="whitespace-nowrap">
                <span className="max-sm:hidden">Looking at move </span>
                <span className="sm:hidden">Move </span>
                <span className="font-mono tabular-nums">{mode.ply}</span> of{" "}
                <span className="font-mono tabular-nums">{mode.total}</span>
              </span>
            )}
          </span>
          <Button size="sm" variant="outline" onClick={mode.onBack} className="shrink-0">
            {mode.live ? "Back to live" : "Back to end"}
          </Button>
        </>
      );
      break;
  }

  return (
    // The live region stays mounted; the inner panel is keyed so its entrance animation replays per state.
    <div aria-live="polite" className={className}>
      <div key={mode.kind} data-turn={mode.kind} className={cn(base, tone)}>
        {body}
      </div>
    </div>
  );
}
