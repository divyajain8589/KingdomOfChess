"use client";

import { Loader2 } from "lucide-react";
import { useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { errorMessage } from "@/lib/api";
import { fromLocalInputValue, localTimeZone, toLocalInputValue } from "@/lib/format";
import type { TournamentInput } from "@/lib/queries";
import type { Tournament } from "@/lib/types";

const PRESETS = ["3+0", "3+2", "5+0", "5+3", "10+0", "10+5", "15+10"];

/** Create/edit form. Times are typed in the coach's local timezone and sent as UTC instants. */
export function TournamentForm({
  initial,
  lockTimeControl,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial?: Tournament;
  lockTimeControl?: boolean;
  submitLabel: string;
  onSubmit: (input: TournamentInput) => Promise<unknown>;
  onCancel?: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [minutes, setMinutes] = useState(String(initial?.timeControlMinutes ?? 5));
  const [increment, setIncrement] = useState(String(initial?.incrementSeconds ?? 0));
  const [startsAt, setStartsAt] = useState(() =>
    toLocalInputValue(initial?.startsAt ?? new Date(Date.now() + 24 * 60 * 60 * 1000)),
  );
  const [status, setStatus] = useState<"draft" | "open">("draft");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const m = Number(minutes);
  const inc = Number(increment);
  const clientError =
    name.trim().length < 3
      ? "Name must be at least 3 characters"
      : !Number.isInteger(m) || m < 1 || m > 180
        ? "Minutes per player must be a whole number from 1 to 180"
        : !Number.isInteger(inc) || inc < 0 || inc > 60
          ? "Increment must be a whole number from 0 to 60 seconds"
          : !startsAt
            ? "Pick a start date and time"
            : null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (clientError) return setError(clientError);
    setError(null);
    setPending(true);
    try {
      await onSubmit({
        name: name.trim(),
        description: description.trim() || undefined,
        timeControlMinutes: m,
        incrementSeconds: inc,
        startsAt: fromLocalInputValue(startsAt),
        ...(!initial && { status }),
      });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <div className="space-y-2">
        <Label htmlFor="t-name">Name</Label>
        <Input id="t-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="t-desc">Description (optional)</Label>
        <Textarea id="t-desc" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={1000} rows={2} />
      </div>
      <div className="space-y-2">
        <Label>Time control</Label>
        <div className="flex flex-wrap gap-1.5">
          {PRESETS.map((p) => {
            const [pm, pi] = p.split("+");
            const active = pm === minutes && pi === increment;
            return (
              <Button
                key={p}
                type="button"
                size="xs"
                variant={active ? "default" : "outline"}
                disabled={lockTimeControl}
                onClick={() => {
                  setMinutes(pm);
                  setIncrement(pi);
                }}
              >
                {p}
              </Button>
            );
          })}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label htmlFor="t-min" className="text-xs text-muted-foreground">
              Minutes per player
            </Label>
            <Input id="t-min" type="number" min={1} max={180} value={minutes} disabled={lockTimeControl} onChange={(e) => setMinutes(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="t-inc" className="text-xs text-muted-foreground">
              Increment (seconds)
            </Label>
            <Input id="t-inc" type="number" min={0} max={60} value={increment} disabled={lockTimeControl} onChange={(e) => setIncrement(e.target.value)} />
          </div>
        </div>
        {lockTimeControl && <p className="text-xs text-muted-foreground">Locked once games have started.</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="t-start">Starts</Label>
        <Input id="t-start" type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} required />
        <p className="text-xs text-muted-foreground">Your local time ({localTimeZone()}).</p>
      </div>
      {!initial && (
        <div className="space-y-2">
          <Label>Visibility</Label>
          <Select value={status} onValueChange={(v) => setStatus(v as "draft" | "open")}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">Draft — only coaches can see it</SelectItem>
              <SelectItem value="open">Open — students can join now</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
      <div className="flex justify-end gap-2 pt-2">
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="animate-spin" />} {submitLabel}
        </Button>
      </div>
    </form>
  );
}
