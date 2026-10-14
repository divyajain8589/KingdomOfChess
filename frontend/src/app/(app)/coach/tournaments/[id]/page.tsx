"use client";

import { ArrowLeft, DoorOpen, Flag, Lock, MoreHorizontal, Pencil, Play, Trash2, Undo2, UserMinus, UserPlus } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { LeaderboardCard } from "@/components/leaderboard";
import { MatchList } from "@/components/match-list";
import { MetaLine, PageHeader } from "@/components/page-header";
import { PlayerAvatar } from "@/components/player-avatar";
import { RoleGate } from "@/components/role-gate";
import { Stat } from "@/components/stat";
import { EmptyState, ErrorState, HeaderSkeleton, TableSkeleton } from "@/components/states";
import { StatusPill } from "@/components/status-badge";
import { TournamentForm } from "@/components/tournament-form";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { TabCount, Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useWatchTournament } from "@/hooks/use-watch-tournament";
import { errorMessage } from "@/lib/api";
import { formatDate, formatDateTime } from "@/lib/format";
import {
  useAddParticipant,
  useDeleteTournament,
  useLeaderboard,
  useRemoveParticipant,
  useSetTournamentStatus,
  useStudents,
  useTournament,
  useTournamentMatches,
  useUpdateTournament,
} from "@/lib/queries";
import type { TournamentDetail, TournamentStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function CoachTournamentPage() {
  return (
    <RoleGate role="coach">
      <CoachTournament />
    </RoleGate>
  );
}

function eyebrowFor(t: TournamentDetail) {
  switch (t.status) {
    case "draft":
      return "Draft";
    case "open":
      return "Open for registration";
    case "ongoing":
      return `Live now · ${t.progress.played} of ${t.progress.total} games played`;
    case "completed":
      return t.completedAt ? `Finished on ${formatDate(t.completedAt)}` : "Finished";
  }
}

function CoachTournament() {
  const { id } = useParams<{ id: string }>();
  const q = useTournament(id);
  useWatchTournament(id);

  if (q.isPending) return <DetailSkeleton />;
  if (q.isError) {
    return (
      <div className="space-y-6">
        <BackLink />
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      </div>
    );
  }
  const t = q.data;
  const showProgress = t.status === "ongoing" || t.status === "completed";
  const gameCount = t.progress.played + t.progress.live;

  return (
    <div className="space-y-8">
      <PageHeader
        band
        back={{ href: "/coach", label: "All tournaments" }}
        eyebrow={eyebrowFor(t)}
        title={t.name}
        badge={<StatusPill status={t.status} />}
        description={t.description}
        meta={
          <MetaLine>
            {t.timeControl}
            {formatDateTime(t.startsAt)}
            {`${t.participantCount} ${t.participantCount === 1 ? "player" : "players"}`}
          </MetaLine>
        }
        actions={t.status !== "completed" ? <TournamentActions t={t} /> : undefined}
      />

      {showProgress && <ProgressStrip t={t} />}

      <Tabs defaultValue={t.status === "draft" || t.status === "open" ? "participants" : "leaderboard"} className="gap-6">
        <TabsList aria-label="Tournament sections">
          <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
          <TabsTrigger value="matches">
            Games<TabCount>{gameCount}</TabCount>
          </TabsTrigger>
          <TabsTrigger value="participants">
            Players<TabCount>{t.participantCount}</TabCount>
          </TabsTrigger>
        </TabsList>
        <TabsContent value="leaderboard">
          <LeaderboardCard tournamentId={id} showProgress={!showProgress} />
        </TabsContent>
        <TabsContent value="matches">
          <MatchesTab tournamentId={id} />
        </TabsContent>
        <TabsContent value="participants">
          <ParticipantsTab t={t} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function BackLink() {
  return (
    <Link
      href="/coach"
      className="focus-ring -ml-2 inline-flex h-9 items-center gap-1.5 rounded-full pr-3 pl-2 text-[13px] font-semibold text-muted-foreground hover:bg-surface-inset hover:text-foreground"
    >
      <ArrowLeft className="size-4" aria-hidden />
      All tournaments
    </Link>
  );
}

function DetailSkeleton() {
  return (
    <div className="space-y-10">
      <div className="space-y-4">
        <Skeleton className="h-9 w-36 rounded-full" />
        <HeaderSkeleton />
      </div>
      <div className="space-y-6">
        <div className="flex h-11 items-center gap-6 border-b border-border">
          <Skeleton className="h-3.5 w-24" />
          <Skeleton className="h-3.5 w-16" />
          <Skeleton className="h-3.5 w-20" />
        </div>
        <TableSkeleton rows={4} />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ progress */

function ProgressStrip({ t }: { t: TournamentDetail }) {
  const lb = useLeaderboard(t.id);
  const { played, live, total } = t.progress;
  const remaining = Math.max(0, total - played - live);
  const segments = [
    ...Array.from({ length: played }, () => "played" as const),
    ...Array.from({ length: live }, () => "live" as const),
    ...Array.from({ length: remaining }, () => "remaining" as const),
  ];
  return (
    <Card variant="inset" size="sm" className="gap-4 px-4">
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        <Stat label="Games played" value={played} sub={`/ ${total}`} className="bg-card" />
        <Stat label="Live now" value={live} className="bg-card" />
        <Stat label="Players" value={t.participantCount} className="bg-card" />
        <Stat
          label="Decisive"
          value={lb.data ? lb.data.stats.decisive : "–"}
          sub={lb.data ? `${lb.data.stats.draws} drawn` : undefined}
          className="hidden bg-card sm:block"
        />
      </div>
      {total > 0 && (
        <div
          role="progressbar"
          aria-label="Games played"
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={played}
          aria-valuetext={`${played} of ${total} games played, ${live} live`}
          className="flex h-2 gap-0.5"
        >
          {segments.map((s, i) => (
            <span
              key={i}
              className={cn(
                "h-full flex-1 first:rounded-l-full last:rounded-r-full",
                s === "played" && "bg-primary",
                s === "live" && "animate-live-pulse bg-brand-orange",
                s === "remaining" && "bg-surface-inset-strong",
              )}
            />
          ))}
        </div>
      )}
    </Card>
  );
}

/* ------------------------------------------------------------------ actions */

type ConfirmKind = "open" | "start" | "end" | "delete";

const PRIMARY: Partial<Record<TournamentStatus, { kind: Exclude<ConfirmKind, "delete">; label: string; icon: React.ReactNode }>> = {
  draft: { kind: "open", label: "Open registration", icon: <DoorOpen /> },
  open: { kind: "start", label: "Start tournament", icon: <Play /> },
  ongoing: { kind: "end", label: "End tournament", icon: <Flag /> },
};

const TO: Record<Exclude<ConfirmKind, "delete">, TournamentStatus> = { open: "open", start: "ongoing", end: "completed" };

function TournamentActions({ t }: { t: TournamentDetail }) {
  const setStatus = useSetTournamentStatus(t.id);
  const del = useDeleteTournament();
  const update = useUpdateTournament(t.id);
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmKind | null>(null);
  const primary = PRIMARY[t.status];
  const canDelete = t.status === "draft" || t.status === "open";
  const canUnpublish = t.status === "open";

  async function changeStatus(to: TournamentStatus) {
    try {
      await setStatus.mutateAsync(to);
      toast.success(to === "completed" ? "Tournament completed" : "Status updated");
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  async function remove() {
    try {
      await del.mutateAsync(t.id);
      toast.success("Tournament deleted");
      router.push("/coach");
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  const copy: Record<ConfirmKind, { title: string; body: string; action: string; cancel: string }> = {
    open: {
      title: `Open ${t.name} for registration?`,
      body: "Students will see it and can join straight away.",
      action: "Open registration",
      cancel: "Not yet",
    },
    start: {
      title: "Start the tournament?",
      body: "Registration closes and players can start finding opponents. The player list and time control are then locked.",
      action: "Start now",
      cancel: "Not yet",
    },
    end: {
      title: "End the tournament now?",
      body: "Matchmaking stops and the current leader becomes the winner. It also ends by itself once everyone has played everyone.",
      action: "End tournament",
      cancel: "Keep playing",
    },
    delete: {
      title: `Delete ${t.name}?`,
      body: "This removes the tournament and everyone's registration. You can't undo this.",
      action: "Delete",
      cancel: "Cancel",
    },
  };
  const c = confirm ? copy[confirm] : null;

  return (
    <div className="flex items-center gap-2">
      {/* Desktop: secondary actions as buttons */}
      <Button variant="outline" className="max-sm:hidden" onClick={() => setEditing(true)}>
        <Pencil /> Edit
      </Button>
      {canUnpublish && (
        <Button
          variant="ghost"
          className="max-sm:hidden"
          loading={setStatus.isPending && setStatus.variables === "draft"}
          disabled={setStatus.isPending}
          onClick={() => changeStatus("draft")}
        >
          <Undo2 /> Move back to draft
        </Button>
      )}
      {canDelete && (
        <Button variant="destructive" className="max-sm:hidden" onClick={() => setConfirm("delete")}>
          <Trash2 /> Delete
        </Button>
      )}
      {primary && (
        <Button
          size="lg"
          className="flex-1 sm:flex-none"
          loading={setStatus.isPending && setStatus.variables === TO[primary.kind]}
          disabled={setStatus.isPending}
          onClick={() => setConfirm(primary.kind)}
        >
          {primary.icon} {primary.label}
        </Button>
      )}

      {/* Mobile: secondary actions behind a menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon-lg" className="sm:hidden" aria-label="More actions">
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-52">
          <DropdownMenuItem onSelect={() => setEditing(true)}>
            <Pencil /> Edit
          </DropdownMenuItem>
          {canUnpublish && (
            <DropdownMenuItem disabled={setStatus.isPending} onSelect={() => changeStatus("draft")}>
              <Undo2 /> Move back to draft
            </DropdownMenuItem>
          )}
          {canDelete && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onSelect={() => setConfirm("delete")}>
                <Trash2 /> Delete
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={confirm !== null} onOpenChange={(o) => !o && setConfirm(null)}>
        <AlertDialogContent className="rounded-2xl">
          {c && (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>{c.title}</AlertDialogTitle>
                <AlertDialogDescription>{c.body}</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{c.cancel}</AlertDialogCancel>
                <AlertDialogAction
                  variant={confirm === "delete" ? "destructive" : "default"}
                  onClick={() => {
                    if (confirm === "delete") void remove();
                    else if (confirm) void changeStatus(TO[confirm]);
                  }}
                >
                  {c.action}
                </AlertDialogAction>
              </AlertDialogFooter>
            </>
          )}
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent className="gap-0 p-0 max-sm:pb-0 sm:max-w-lg">
          <DialogHeader className="border-b border-border p-6 pr-14">
            <p className="eyebrow">— Edit tournament</p>
            <DialogTitle>{t.name}</DialogTitle>
            <DialogDescription>
              {t.status === "ongoing"
                ? "Games are under way, so the time control is locked."
                : t.status === "draft"
                  ? "Drafts are only visible to you until you open registration."
                  : "Changes show up for students straight away."}
            </DialogDescription>
          </DialogHeader>
          <TournamentForm
            initial={t}
            lockTimeControl={t.status === "ongoing"}
            submitLabel="Save changes"
            onCancel={() => setEditing(false)}
            onSubmit={async (input) => {
              const { timeControlMinutes, incrementSeconds, ...rest } = input;
              await update.mutateAsync(t.status === "ongoing" ? rest : { ...rest, timeControlMinutes, incrementSeconds });
              toast.success("Saved");
              setEditing(false);
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ------------------------------------------------------------------ games */

function MatchesTab({ tournamentId }: { tournamentId: string }) {
  const q = useTournamentMatches(tournamentId);
  if (q.isPending) return <TableSkeleton rows={4} />;
  if (q.isError) return <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  return <MatchList matches={q.data} emptyText="No games yet" />;
}

/* ------------------------------------------------------------------ players */

function ParticipantsTab({ t }: { t: TournamentDetail }) {
  const editable = t.status === "draft" || t.status === "open";
  const students = useStudents(editable);
  const add = useAddParticipant(t.id);
  const remove = useRemoveParticipant(t.id);
  const [selected, setSelected] = useState("");
  const registered = new Set(t.participants.map((p) => p.id));
  const available = students.data?.filter((s) => !registered.has(s.id)) ?? [];

  return (
    <div className="space-y-4">
      {editable ? (
        students.isError ? (
          <ErrorState error={students.error} onRetry={() => students.refetch()} title="Couldn't load your students" />
        ) : (
          <div className="flex flex-col gap-2 sm:flex-row">
            <Select value={selected} onValueChange={setSelected} disabled={students.isPending || available.length === 0}>
              <SelectTrigger className="w-full data-[size=default]:h-12 rounded-xl sm:w-72" aria-label="Student to add">
                <SelectValue
                  placeholder={
                    students.isPending ? "Loading students…" : available.length ? "Add a student…" : "Everyone's already in"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {available.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="lg"
              disabled={!selected}
              loading={add.isPending}
              onClick={async () => {
                try {
                  await add.mutateAsync(selected);
                  setSelected("");
                } catch (err) {
                  toast.error(errorMessage(err));
                }
              }}
            >
              <UserPlus /> Add
            </Button>
          </div>
        )
      ) : (
        <div className="flex items-center gap-2.5 rounded-xl bg-surface-inset px-4 py-3 text-[14px] text-muted-foreground">
          <Lock className="size-4 shrink-0" aria-hidden />
          The player list is locked once the tournament starts.
        </div>
      )}

      {t.participants.length === 0 ? (
        <EmptyState
          art="pawns"
          title="No players yet"
          description="Open registration so students can join, or add them here."
        />
      ) : (
        <ul className="divide-y divide-border/70 overflow-hidden rounded-xl border border-border bg-card shadow-card">
          {t.participants.map((p) => (
            <li key={p.id} className="flex min-h-16 items-center gap-3 px-4 py-2.5">
              <PlayerAvatar name={p.name} userId={p.id} size="md" />
              <div className="min-w-0 flex-1">
                <div className="truncate font-bold">{p.name}</div>
                <div className="truncate font-mono text-[12px] text-muted-foreground">
                  {p.email && `${p.email} · `}joined {formatDate(p.joinedAt)}
                </div>
              </div>
              {editable && (
                <>
                  <Button
                    variant="ghost"
                    className="max-sm:hidden"
                    disabled={remove.isPending}
                    onClick={() => remove.mutateAsync(p.id).catch((err) => toast.error(errorMessage(err)))}
                  >
                    <UserMinus /> Remove
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="sm:hidden"
                    aria-label={`Remove ${p.name}`}
                    disabled={remove.isPending}
                    onClick={() => remove.mutateAsync(p.id).catch((err) => toast.error(errorMessage(err)))}
                  >
                    <UserMinus />
                  </Button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
