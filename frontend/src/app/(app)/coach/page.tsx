"use client";

import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Accent, PageHeader } from "@/components/page-header";
import { RoleGate } from "@/components/role-gate";
import { Stat } from "@/components/stat";
import { EmptyState, ErrorState, LoadingState } from "@/components/states";
import { TournamentCard } from "@/components/tournament-card";
import { TournamentForm } from "@/components/tournament-form";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TabCount, Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCreateTournament, useTournaments } from "@/lib/queries";
import type { Tournament, TournamentStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

type Filter = "all" | TournamentStatus;

const FILTERS: { value: Filter; label: string; empty: string }[] = [
  { value: "all", label: "All", empty: "" },
  { value: "draft", label: "Drafts", empty: "draft" },
  { value: "open", label: "Open", empty: "open" },
  { value: "ongoing", label: "Live", empty: "live" },
  { value: "completed", label: "Finished", empty: "finished" },
];

const STATS: { value: TournamentStatus; label: string }[] = [
  { value: "ongoing", label: "Live now" },
  { value: "open", label: "Open to join" },
  { value: "draft", label: "Drafts" },
  { value: "completed", label: "Finished" },
];

/** Live first, then open, draft, finished; upcoming by start date, finished most recent first. */
const ORDER: Record<TournamentStatus, number> = { ongoing: 0, open: 1, draft: 2, completed: 3 };
function byLedgerOrder(a: Tournament, b: Tournament) {
  if (a.status !== b.status) return ORDER[a.status] - ORDER[b.status];
  const diff = new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime();
  return a.status === "completed" ? -diff : diff;
}

export default function CoachTournamentsPage() {
  return (
    <RoleGate role="coach">
      <CoachTournaments />
    </RoleGate>
  );
}

function CoachTournaments() {
  const [filter, setFilter] = useState<Filter>("all");
  const [creating, setCreating] = useState(false);
  // One fetch for everything: the tab counts and summary tiles need the whole list anyway.
  const q = useTournaments();
  const create = useCreateTournament();
  const router = useRouter();

  const sorted = useMemo(() => (q.data ? [...q.data].sort(byLedgerOrder) : []), [q.data]);
  const counts = useMemo(() => {
    const c: Record<Filter, number> = { all: sorted.length, draft: 0, open: 0, ongoing: 0, completed: 0 };
    for (const t of sorted) c[t.status]++;
    return c;
  }, [sorted]);
  const visible = filter === "all" ? sorted : sorted.filter((t) => t.status === filter);
  const filterLabel = FILTERS.find((f) => f.value === filter)?.empty;

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow="Coach dashboard"
        title={
          <>
            Your <Accent>tournaments</Accent>
          </>
        }
        description="Create a tournament, open it for your students, and follow every game live."
        actions={
          <Button size="lg" onClick={() => setCreating(true)}>
            <Plus /> New tournament
          </Button>
        }
      />

      <div className="space-y-4">
        {q.isSuccess && sorted.length > 0 && (
          <div className="hidden grid-cols-4 gap-3 sm:grid">
            {STATS.map((s) => (
              <button
                key={s.value}
                type="button"
                onClick={() => setFilter(filter === s.value ? "all" : s.value)}
                aria-pressed={filter === s.value}
                className={cn(
                  "focus-ring rounded-xl text-left transition-shadow hover:shadow-raised",
                  filter === s.value && "ring-2 ring-primary",
                )}
              >
                <Stat label={s.label} value={counts[s.value]} />
              </button>
            ))}
          </div>
        )}

        <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
          <TabsList aria-label="Filter tournaments" className="gap-4 sm:gap-6">
            {FILTERS.map((f) => (
              <TabsTrigger key={f.value} value={f.value}>
                {f.label}
                {q.isSuccess && <TabCount>{counts[f.value]}</TabCount>}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {q.isPending ? (
          <LoadingState rows={3} />
        ) : q.isError ? (
          <ErrorState error={q.error} onRetry={() => q.refetch()} />
        ) : visible.length === 0 ? (
          filter === "all" ? (
            <EmptyState
              art="king"
              title="No tournaments yet"
              description="Set one up in a minute. Pick a time control, add your students, and you're ready."
              action={
                <Button size="lg" onClick={() => setCreating(true)}>
                  <Plus /> Create your first tournament
                </Button>
              }
            />
          ) : (
            <EmptyState
              art="rook"
              title="Nothing here"
              description={`No ${filterLabel} tournaments right now.`}
              action={
                <Button variant="ghost" size="lg" onClick={() => setFilter("all")}>
                  Show all
                </Button>
              }
            />
          )
        ) : (
          <div className="grid gap-3">
            {visible.map((t) => (
              <TournamentCard key={t.id} t={t} href={`/coach/tournaments/${t.id}`} />
            ))}
          </div>
        )}
      </div>

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent className="gap-0 p-0 max-sm:pb-0 sm:max-w-lg">
          <DialogHeader className="border-b border-border p-6 pr-14">
            <p className="eyebrow">New tournament</p>
            <DialogTitle>Set up a tournament</DialogTitle>
            <DialogDescription>Round robin: everyone plays everyone once.</DialogDescription>
          </DialogHeader>
          <TournamentForm
            submitLabel="Create tournament"
            onCancel={() => setCreating(false)}
            onSubmit={async (input) => {
              const t = await create.mutateAsync(input);
              toast.success("Tournament created");
              setCreating(false);
              router.push(`/coach/tournaments/${t.id}`);
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
