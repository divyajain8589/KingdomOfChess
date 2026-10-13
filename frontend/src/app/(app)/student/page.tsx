"use client";

import { CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { ActiveMatchBanner } from "@/components/active-match-banner";
import { RoleGate } from "@/components/role-gate";
import { EmptyState, ErrorState, LoadingState } from "@/components/states";
import { TournamentCard } from "@/components/tournament-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { errorMessage } from "@/lib/api";
import { useJoinTournament, useTournaments } from "@/lib/queries";
import type { Tournament } from "@/lib/types";

export default function StudentHomePage() {
  return (
    <RoleGate role="student">
      <StudentHome />
    </RoleGate>
  );
}

function StudentHome() {
  const q = useTournaments(["open", "ongoing"]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Tournaments</h1>
        <p className="text-muted-foreground">Join an open tournament, then find an opponent once it starts.</p>
      </div>
      <ActiveMatchBanner />
      {q.isPending ? (
        <LoadingState rows={3} />
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      ) : (
        <>
          <Section
            title="In progress"
            empty="No tournaments are running right now."
            items={q.data.filter((t) => t.status === "ongoing")}
          />
          <Section
            title="Open for registration"
            empty="No tournaments are taking registrations at the moment — check back soon!"
            items={q.data.filter((t) => t.status === "open")}
          />
        </>
      )}
    </div>
  );
}

function Section({ title, empty, items }: { title: string; empty: string; items: Tournament[] }) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">{title}</h2>
      {items.length === 0 ? (
        <EmptyState title={empty} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((t) => (
            <TournamentCard key={t.id} t={t} href={`/student/tournaments/${t.id}`} footer={<CardAction t={t} />} />
          ))}
        </div>
      )}
    </section>
  );
}

function CardAction({ t }: { t: Tournament }) {
  const join = useJoinTournament(t.id);
  if (t.joined) {
    return (
      <Badge variant="outline" className="text-emerald-700">
        <CheckCircle2 /> Registered
      </Badge>
    );
  }
  if (t.status !== "open") return <span className="text-xs text-muted-foreground">Registration closed</span>;
  return (
    <Button
      size="sm"
      disabled={join.isPending}
      onClick={() =>
        join
          .mutateAsync()
          .then(() => toast.success(`You're in! Good luck in ${t.name}.`))
          .catch((err) => toast.error(errorMessage(err)))
      }
    >
      {join.isPending && <Loader2 className="animate-spin" />} Join
    </Button>
  );
}
