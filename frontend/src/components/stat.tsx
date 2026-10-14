import { cn } from "@/lib/utils";

/**
 * Small number tile. `label` (eyebrow), `value` (big mono), optional `sub` ("/ 4").
 * `tone="accent"` = navy tile, reserved for the player's own rank. Group in `grid grid-cols-3 gap-2`.
 */
export function Stat({
  label,
  value,
  sub,
  tone = "default",
  className,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  sub?: React.ReactNode;
  tone?: "default" | "accent";
  className?: string;
}) {
  const accent = tone === "accent";
  return (
    <div className={cn("rounded-xl px-4 py-3", accent ? "bg-primary text-primary-foreground" : "bg-surface-inset", className)}>
      <div className={cn("text-eyebrow uppercase", accent ? "text-primary-foreground/75" : "text-muted-foreground")}>
        {label}
      </div>
      <div className="mt-1 flex items-baseline gap-1">
        <span className={cn("font-mono text-[26px] leading-none font-bold tabular-nums", accent ? "text-primary-foreground" : "text-foreground")}>
          {value}
        </span>
        {sub != null && (
          <span className={cn("font-mono text-[12px] tabular-nums", accent ? "text-primary-foreground/75" : "text-muted-foreground")}>
            {sub}
          </span>
        )}
      </div>
    </div>
  );
}
