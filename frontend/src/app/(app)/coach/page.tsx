"use client";

import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { RoleGate } from "@/components/role-gate";
import { EmptyState, ErrorState, LoadingState } from "@/components/states";
import { TournamentCard } from "@/components/tournament-card";
import { TournamentForm } from "@/components/tournament-form";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCreateTournament, useTournaments } from "@/lib/queries";
import type { TournamentStatus } from "@/lib/types";

const FILTERS: { value: "all" | TournamentStatus; label: string }[] = [
  { value: "all", label: "All" },
  { value: "draft", label: "Drafts" },
  { value: "open", label: "Open" },
  { value: "ongoing", label: "In progress" },
  { value: "completed", label: "Completed" },
];

export default function CoachTournamentsPage() {
  return (
    <RoleGate role="coach">
      <CoachTournaments />
    </RoleGate>
  );
}

function CoachTournaments() {
  const [filter, setFilter] = useState<"all" | TournamentStatus>("all");
  const [creating, setCreating] = useState(false);
  const q = useTournaments(filter === "all" ? undefined : [filter]);
  const create = useCreateTournament();
  const router = useRouter();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Tournaments</h1>
          <p className="text-muted-foreground">Create tournaments, open registration and follow results live.</p>
        </div>
        <Button onClick={() => setCreating(true)}>
          <Plus /> New tournament
        </Button>
      </div>

      <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
        <TabsList>
          {FILTERS.map((f) => (
            <TabsTrigger key={f.value} value={f.value}>
              {f.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {q.isPending ? (
        <LoadingState rows={3} />
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      ) : q.data.length === 0 ? (
        <EmptyState
          title={filter === "all" ? "No tournaments yet" : "Nothing here"}
          description={filter === "all" ? "Create your first tournament to get started." : "No tournaments with this status."}
          action={
            filter === "all" && (
              <Button onClick={() => setCreating(true)}>
                <Plus /> New tournament
              </Button>
            )
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {q.data.map((t) => (
            <TournamentCard key={t.id} t={t} href={`/coach/tournaments/${t.id}`} />
          ))}
        </div>
      )}

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New tournament</DialogTitle>
            <DialogDescription>Players are paired automatically — everyone plays everyone once.</DialogDescription>
          </DialogHeader>
          <TournamentForm
            submitLabel="Create"
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
