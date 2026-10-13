import { CalendarDays, Clock, Trophy, Users } from "lucide-react";
import Link from "next/link";
import { StatusBadge } from "@/components/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime } from "@/lib/format";
import type { Tournament } from "@/lib/types";

export function TournamentCard({ t, href, footer }: { t: Tournament; href: string; footer?: React.ReactNode }) {
  return (
    <Card className="relative flex flex-col transition-shadow hover:shadow-md">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="leading-snug">
            <Link href={href} className="after:absolute after:inset-0 hover:underline">
              {t.name}
            </Link>
          </CardTitle>
          <StatusBadge status={t.status} />
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-3">
        {t.description && <p className="line-clamp-2 text-sm text-muted-foreground">{t.description}</p>}
        <dl className="grid grid-cols-2 gap-2 text-sm">
          <div className="flex items-center gap-1.5">
            <Clock className="size-4 text-muted-foreground" />
            <dt className="sr-only">Time control</dt>
            <dd className="font-mono">{t.timeControl}</dd>
          </div>
          <div className="flex items-center gap-1.5">
            <Users className="size-4 text-muted-foreground" />
            <dt className="sr-only">Players</dt>
            <dd>{t.participantCount} players</dd>
          </div>
          <div className="col-span-2 flex items-center gap-1.5">
            <CalendarDays className="size-4 text-muted-foreground" />
            <dt className="sr-only">Starts</dt>
            <dd>{formatDateTime(t.startsAt)}</dd>
          </div>
          {t.winner && (
            <div className="col-span-2 flex items-center gap-1.5">
              <Trophy className="size-4 text-amber-500" />
              <dt className="sr-only">Winner</dt>
              <dd className="font-medium">{t.winner.name}</dd>
            </div>
          )}
        </dl>
        {footer && <div className="relative z-10 mt-auto pt-1">{footer}</div>}
      </CardContent>
    </Card>
  );
}
