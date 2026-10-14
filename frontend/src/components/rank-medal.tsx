import { CrownGlyph } from "@/components/logo";
import { cn } from "@/lib/utils";

const ordinal = (n: number) => {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`;
};

/**
 * Rank marker in a 28px box: gold/silver/bronze medals for 1-3 (gold gets a tiny crown),
 * plain mono number for 4+, "–" when `rank` is null/undefined (no games yet).
 */
export function RankMedal({ rank, className }: { rank: number | null | undefined; className?: string }) {
  if (rank == null || rank < 1) {
    return (
      <span
        aria-label="Not ranked yet"
        className={cn("grid size-7 shrink-0 place-items-center font-mono text-[13px] text-muted-foreground", className)}
      >
        –
      </span>
    );
  }
  const label = `${ordinal(rank)} place`;
  if (rank > 3) {
    return (
      <span
        aria-label={label}
        className={cn(
          "grid size-7 shrink-0 place-items-center font-mono text-[13px] font-semibold text-muted-foreground tabular-nums",
          className,
        )}
      >
        {rank}
      </span>
    );
  }
  return (
    <span
      aria-label={label}
      className={cn(
        "relative grid size-7 shrink-0 place-items-center rounded-full text-[13px] font-extrabold tabular-nums",
        // gold-ink darkened a touch so the digit keeps contrast on the solid gold fill
        rank === 1 && "bg-gold text-[color-mix(in_oklch,var(--gold-ink),black_30%)] ring-2 ring-gold/40",
        rank === 2 && "bg-silver/25 text-foreground",
        rank === 3 && "bg-bronze/20 text-bronze",
        className,
      )}
    >
      {rank === 1 && <CrownGlyph className="absolute -top-2 left-1/2 w-3 -translate-x-1/2 fill-gold" />}
      <span aria-hidden>{rank}</span>
    </span>
  );
}
