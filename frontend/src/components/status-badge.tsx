import type { TournamentStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const PILL: Record<TournamentStatus, { label: string; className: string; dot?: string }> = {
  draft: { label: "Draft", className: "bg-surface-inset text-muted-foreground", dot: "bg-transparent ring-1 ring-current" },
  open: { label: "Open to join", className: "bg-info-soft text-info" },
  ongoing: { label: "Live now", className: "bg-brand-orange-soft text-brand-orange-ink", dot: "animate-live-pulse" },
  completed: { label: "Finished", className: "bg-success-soft text-success" },
};

/** Human label for a tournament status, matching the pill ("Open to join", "Live now", ...). */
export const statusPillLabel = (status: TournamentStatus) => PILL[status].label;

/** Tournament status pill with a leading dot (pulses when live). Optional `label` overrides the text. */
export function StatusPill({
  status,
  label,
  className,
}: {
  status: TournamentStatus;
  label?: string;
  className?: string;
}) {
  const s = PILL[status];
  return (
    <span
      data-status={status}
      className={cn(
        "inline-flex h-6 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-[12px] font-bold whitespace-nowrap",
        s.className,
        className,
      )}
    >
      <span aria-hidden className={cn("size-1.5 rounded-full bg-current", s.dot)} />
      {label ?? s.label}
    </span>
  );
}

/** Orange "LIVE" pill with a pulsing navy dot, for individual games in progress. */
export function LivePill({ className, label = "Live" }: { className?: string; label?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 shrink-0 items-center gap-1.5 rounded-full bg-brand-orange px-2.5 text-[11px] font-extrabold tracking-[0.12em] text-brand-orange-foreground uppercase",
        className,
      )}
    >
      <span aria-hidden className="size-1.5 animate-live-pulse rounded-full bg-brand-orange-foreground" />
      {label}
    </span>
  );
}

/** @deprecated Use StatusPill. Kept so existing pages compile. */
export const StatusBadge = StatusPill;
