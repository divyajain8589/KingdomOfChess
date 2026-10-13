import { Badge } from "@/components/ui/badge";
import { STATUS_LABEL } from "@/lib/format";
import type { TournamentStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const STYLES: Record<TournamentStatus, string> = {
  draft: "bg-muted text-muted-foreground",
  open: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-200",
  ongoing: "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-200",
  completed: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
};

export function StatusBadge({ status }: { status: TournamentStatus }) {
  return (
    <Badge variant="secondary" className={cn("border-transparent", STYLES[status])}>
      {status === "ongoing" && <span className="size-1.5 animate-pulse rounded-full bg-current" />}
      {STATUS_LABEL[status]}
    </Badge>
  );
}
