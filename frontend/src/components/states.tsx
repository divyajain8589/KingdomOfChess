"use client";

import { RotateCw } from "lucide-react";
import { defaultPieces } from "react-chessboard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { errorMessage } from "@/lib/api";
import { cn } from "@/lib/utils";

export type StateArtKind = "king" | "knight" | "pawns" | "rook" | "error";

/** A single default-set chess piece as inline SVG, e.g. <Piece code="wN" className="size-12" />. */
export function Piece({ code, className }: { code: string; className?: string }) {
  const render = defaultPieces[code];
  return (
    <span aria-hidden className={cn("inline-block size-12 shrink-0", className)}>
      {render?.()}
    </span>
  );
}

/** 96px checker tile with one chess piece: the illustration used by EmptyState / ErrorState. */
export function StateArt({ art, className }: { art: StateArtKind; className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        "checker relative grid size-24 shrink-0 place-items-center rounded-2xl bg-surface-raised ring-1 ring-border [--checker-size:24px]",
        className,
      )}
    >
      {art === "king" && <Piece code="wK" className="-rotate-8" />}
      {art === "knight" && <Piece code="wN" />}
      {art === "rook" && <Piece code="bR" />}
      {art === "error" && <Piece code="bK" className="translate-y-1 rotate-90" />}
      {art === "pawns" && (
        <span className="relative size-12">
          <Piece code="wP" className="absolute top-0 left-2.5 opacity-40" />
          <Piece code="wP" className="absolute top-0 -left-1" />
        </span>
      )}
    </div>
  );
}

/**
 * Friendly empty view. `art`: king (no tournaments) | knight (no games) | pawns (no players) | rook (nothing scheduled).
 * `action` is usually a <Button size="lg">.
 */
export function EmptyState({
  title,
  description,
  action,
  art = "king",
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  art?: StateArtKind;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border-strong bg-surface-raised px-6 py-10 text-center",
        className,
      )}
    >
      <StateArt art={art} className="mb-1" />
      <p className="text-h3 text-foreground">{title}</p>
      {description && <p className="max-w-sm text-[14px] text-muted-foreground">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

/**
 * Load failure with a retry. Default title "Hmm, that didn't load"; description is the error message
 * plus "Check your internet and try again." Pass `description` to override, `action` for extra buttons.
 */
export function ErrorState({
  error,
  onRetry,
  title = "Hmm, that didn't load",
  description,
  action,
  className,
}: {
  error: unknown;
  onRetry?: () => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center gap-3 rounded-2xl border border-danger/25 bg-danger-soft/40 px-6 py-10 text-center",
        className,
      )}
    >
      <StateArt art="error" className="mb-1" />
      <p className="text-h3 text-foreground">{title}</p>
      <p className="max-w-sm text-[14px] text-muted-foreground">
        {description ?? `${errorMessage(error).replace(/\.?$/, ".")} Check your internet and try again.`}
      </p>
      {(onRetry || action) && (
        <div className="mt-2 flex flex-wrap justify-center gap-2">
          {onRetry && (
            <Button variant="outline" size="lg" onClick={onRetry}>
              <RotateCw /> Try again
            </Button>
          )}
          {action}
        </div>
      )}
    </div>
  );
}

/* ---------------- skeletons (match the real content's shape) ---------------- */

function Loading({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={className} role="status" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading…</span>
      {children}
    </div>
  );
}

/** Ledger-row placeholder: date block, title + meta bars, pill on the right. */
export function TournamentRowSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-5 rounded-xl border border-border bg-card p-4 shadow-card sm:p-5", className)}>
      <Skeleton className="h-14 w-14 shrink-0 rounded-xl sm:w-16" />
      <div className="flex-1 space-y-2.5">
        <Skeleton className="h-4 w-2/5" />
        <Skeleton className="h-3 w-1/4" />
      </div>
      <Skeleton className="hidden h-6 w-20 rounded-full sm:block" />
    </div>
  );
}

/** Table placeholder: header bar plus `rows` rows of avatar + two bars. */
export function TableSkeleton({ rows = 4, className }: { rows?: number; className?: string }) {
  return (
    <Loading className={cn("overflow-hidden rounded-xl border border-border bg-card", className)}>
      <div className="flex h-10 items-center gap-6 bg-surface-inset px-4">
        <Skeleton className="h-2.5 w-10 bg-border-strong/60" />
        <Skeleton className="h-2.5 w-24 bg-border-strong/60" />
        <Skeleton className="ml-auto h-2.5 w-10 bg-border-strong/60" />
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex h-14 items-center gap-3 border-t border-border/70 px-4">
          <Skeleton className="size-7 rounded-full" />
          <Skeleton className="h-3.5 w-1/3" />
          <Skeleton className="ml-auto h-3.5 w-12" />
        </div>
      ))}
    </Loading>
  );
}

/** Page-header placeholder: eyebrow, 60% title, meta bar. */
export function HeaderSkeleton({ className }: { className?: string }) {
  return (
    <Loading className={cn("space-y-3", className)}>
      <Skeleton className="h-3 w-28" />
      <Skeleton className="h-8 w-3/5" />
      <Skeleton className="h-3.5 w-1/3" />
    </Loading>
  );
}

/** Feature / schedule card placeholder: eyebrow, title, meta, 3 stat tiles, CTA bar. */
export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-4 rounded-xl border border-border bg-card p-5 shadow-card sm:p-6", className)}>
      <Skeleton className="h-3 w-20" />
      <Skeleton className="h-6 w-3/5" />
      <Skeleton className="h-3.5 w-2/5" />
      <div className="grid grid-cols-3 gap-2">
        <Skeleton className="h-16 rounded-xl" />
        <Skeleton className="h-16 rounded-xl" />
        <Skeleton className="h-16 rounded-xl" />
      </div>
      <Skeleton className="h-12 rounded-xl" />
    </div>
  );
}

/** List of `rows` TournamentRowSkeletons (generic list loading). */
export function LoadingState({ rows = 3, className }: { rows?: number; className?: string }) {
  return (
    <Loading className={cn("grid gap-3", className)}>
      {Array.from({ length: rows }).map((_, i) => (
        <TournamentRowSkeleton key={i} />
      ))}
    </Loading>
  );
}

function StripSkeleton() {
  return (
    <div className="flex items-center gap-3 py-2">
      <Skeleton className="size-9 rounded-full" />
      <Skeleton className="h-4 w-32" />
      <Skeleton className="ml-auto h-12 w-28 rounded-xl" />
    </div>
  );
}

/** Match page placeholder: two player strips around a square board, plus side panel. */
export function MatchSkeleton({ className }: { className?: string }) {
  return (
    <Loading className={cn("grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_360px]", className)}>
      <div className="mx-auto w-full max-w-[min(680px,calc(100dvh-13rem))]">
        <StripSkeleton />
        <Skeleton className="checker aspect-square w-full rounded-2xl [--checker-color:oklch(0.248_0.049_253.4/0.05)]" />
        <StripSkeleton />
      </div>
      <div className="space-y-4">
        <Skeleton className="h-14 rounded-2xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    </Loading>
  );
}
