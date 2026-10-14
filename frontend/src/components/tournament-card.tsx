"use client";

import { format } from "date-fns";
import { ChevronRight, Crown } from "lucide-react";
import Link from "next/link";
import { MetaLine } from "@/components/page-header";
import { StatusPill } from "@/components/status-badge";
import { Card } from "@/components/ui/card";
import { formatDateTime } from "@/lib/format";
import { useTournament } from "@/lib/queries";
import type { Tournament } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Ledger row for one tournament: date block, title (stretched link), meta line, status pill.
 * `footer` (e.g. a Join button) sits on the right when there is room and under the text when there isn't;
 * it is lifted above the stretched link so it stays clickable.
 */
export function TournamentCard({ t, href, footer }: { t: Tournament; href: string; footer?: React.ReactNode }) {
  const start = new Date(t.startsAt);
  return (
    <Card interactive className="@container flex-row gap-0 p-4 sm:p-5">
      <div className="flex w-full flex-wrap items-center gap-x-4 gap-y-3 @lg:flex-nowrap @lg:gap-x-5">
        {/* Date block: decorative, the full date is in the meta line */}
        <div aria-hidden className="w-14 shrink-0 self-start rounded-xl bg-surface-inset py-2 text-center @lg:w-16 @lg:self-center">
          <div className="font-mono text-[22px] leading-none font-bold tabular-nums">{format(start, "dd")}</div>
          <div className="mt-1 text-eyebrow text-muted-foreground uppercase">{format(start, "MMM")}</div>
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="text-h3 leading-snug">
            <Link href={href} className="outline-none after:absolute after:inset-0 after:z-0 hover:underline hover:underline-offset-4">
              {t.name}
            </Link>
          </h3>
          <StatusPill status={t.status} className="mt-1.5 @lg:hidden" />
          {t.description && (
            <p className="mt-0.5 hidden truncate text-[14px] text-muted-foreground @lg:block">{t.description}</p>
          )}
          <MetaLine className="mt-1.5">
            {t.timeControl}
            {formatDateTime(t.startsAt)}
            {`${t.participantCount} ${t.participantCount === 1 ? "player" : "players"}`}
          </MetaLine>
          {t.status === "completed" && t.winner?.name && (
            <p className="mt-1.5 flex items-center gap-1.5 text-[13px] font-semibold text-gold-ink">
              <Crown className="size-3.5 fill-gold text-gold" aria-hidden />
              Won by {t.winner.name}
            </p>
          )}
        </div>

        <div className="hidden shrink-0 flex-col items-end gap-2 @lg:flex">
          <StatusPill status={t.status} />
          {t.status === "ongoing" && <LiveProgress id={t.id} />}
        </div>

        {footer && (
          <div className="relative z-10 w-full shrink-0 pl-18 @lg:w-auto @lg:pl-0">{footer}</div>
        )}

        <ChevronRight
          aria-hidden
          className={cn("size-5 shrink-0 text-muted-foreground", footer ? "hidden @lg:block" : "hidden @md:block")}
        />
      </div>
    </Card>
  );
}

/** "3/6 games" meter for a live tournament. The list endpoint has no progress, so read it from the detail (shared cache). */
function LiveProgress({ id }: { id: string }) {
  const q = useTournament(id);
  if (!q.data || q.data.progress.total === 0) return null;
  const { played, total } = q.data.progress;
  return (
    <div className="flex items-center gap-2">
      <span className="font-mono text-[12px] text-muted-foreground tabular-nums">
        {played}/{total} games
      </span>
      <div
        role="progressbar"
        aria-label="Games played"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={played}
        className="h-1.5 w-24 overflow-hidden rounded-full bg-surface-inset"
      >
        <div className="h-full rounded-full bg-brand-orange" style={{ width: `${(played / total) * 100}%` }} />
      </div>
    </div>
  );
}
