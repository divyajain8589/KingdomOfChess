import { cn } from "@/lib/utils";

/** The brand crown (viewBox 24x14). Colour it with a `fill-*` class. */
export function CrownGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 14" aria-hidden focusable="false" className={className}>
      <path d="M2 11.5 4 2.5l4.6 4.6L12 .8l3.4 6.3L20 2.5l2 9z" />
      <rect x="2" y="12.2" width="20" height="1.8" rx=".9" />
    </svg>
  );
}

/**
 * Wordmark "KINGDOM OF CHESS" with the crown sitting on the O of KINGDOM.
 * `variant`: "default" (navy on paper) | "onNight" (cream on navy). Size follows font-size; override via className.
 */
export function Logo({ variant = "default", className }: { variant?: "default" | "onNight"; className?: string }) {
  return (
    <span
      role="img"
      aria-label="Kingdom of Chess"
      className={cn(
        "inline-flex items-baseline pt-[0.6em] text-[15px] leading-none font-extrabold tracking-[0.08em] whitespace-nowrap uppercase sm:text-base",
        variant === "onNight" ? "text-primary-foreground" : "text-primary",
        className,
      )}
    >
      <span aria-hidden className="inline-flex items-baseline">
        KINGD
        <span className="relative inline-block">
          O
          <CrownGlyph className="absolute -top-[0.62em] left-1/2 w-[0.86em] -translate-x-1/2 fill-brand-orange" />
        </span>
        M
        <span className={cn("mx-[0.35em]", variant === "onNight" ? "text-brand-orange" : "text-brand-orange-ink")}>OF</span>
        CHESS
      </span>
    </span>
  );
}

/** Square navy tile with the orange crown. Default size-9; pass `className="size-14"` for the login hero. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("grid size-9 shrink-0 place-items-center rounded-[10px] bg-primary shadow-cta", className)}
    >
      <CrownGlyph className="w-[55%] fill-brand-orange" />
    </span>
  );
}
