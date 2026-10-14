"use client";

import { AlertCircle, Lock } from "lucide-react";
import { useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { errorMessage } from "@/lib/api";
import { fromLocalInputValue, localTimeZone, toLocalInputValue } from "@/lib/format";
import type { TournamentInput } from "@/lib/queries";
import type { Tournament } from "@/lib/types";
import { cn } from "@/lib/utils";

const PRESETS = ["3+0", "3+2", "5+0", "5+3", "10+0", "10+5", "15+10"];

const speedLabel = (minutes: number) => (minutes < 3 ? "Bullet" : minutes <= 5 ? "Blitz" : minutes <= 30 ? "Rapid" : "Classical");

type Field = "name" | "minutes" | "increment" | "startsAt";

/**
 * Create/edit form, laid out for a `p-0` DialogContent: padded body plus a raised footer with the buttons.
 * Times are typed in the coach's local timezone and sent as UTC instants.
 */
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
  const [custom, setCustom] = useState(() => !PRESETS.includes(`${initial?.timeControlMinutes ?? 5}+${initial?.incrementSeconds ?? 0}`));
  const [startsAt, setStartsAt] = useState(() =>
    toLocalInputValue(initial?.startsAt ?? new Date(Date.now() + 24 * 60 * 60 * 1000)),
  );
  const [status, setStatus] = useState<"draft" | "open">("draft");
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [pending, setPending] = useState(false);

  const m = Number(minutes);
  const inc = Number(increment);
  const fieldErrors: Partial<Record<Field, string>> = {};
  if (name.trim().length < 3) fieldErrors.name = "Name must be at least 3 characters";
  if (!Number.isInteger(m) || m < 1 || m > 180) fieldErrors.minutes = "Minutes per player must be a whole number from 1 to 180";
  if (!Number.isInteger(inc) || inc < 0 || inc > 60) fieldErrors.increment = "Increment must be a whole number from 0 to 60 seconds";
  if (!startsAt) fieldErrors.startsAt = "Pick a start date and time";
  const errs = submitted ? fieldErrors : {};
  // A bad time control is only visible in the custom inputs, so open them when it's invalid.
  const showCustom = custom || Boolean(errs.minutes || errs.increment);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    if (Object.keys(fieldErrors).length) return;
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
    <form onSubmit={submit} noValidate>
      <div className="space-y-5 p-6">
        {error && (
          <Alert variant="destructive" className="rounded-xl border-danger/30 bg-danger-soft/60 px-4 py-3 text-[14px] font-semibold">

            <AlertCircle />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <FieldBlock id="t-name" label="Name" error={errs.name}>
          <Input
            id="t-name"
            size="lg"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={120}
            placeholder="Saturday Blitz Arena"
            required
            aria-invalid={Boolean(errs.name) || undefined}
            aria-describedby={errs.name ? "t-name-error" : undefined}
          />
        </FieldBlock>

        <FieldBlock id="t-desc" label="Description" hint="optional">
          <Textarea
            id="t-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={1000}
            rows={2}
            placeholder="Tell students what to expect"
            className="rounded-xl px-4"
          />
        </FieldBlock>

        <fieldset className="space-y-2" disabled={lockTimeControl}>
          <legend className="mb-2 flex items-center gap-1.5 text-[13px] font-bold">
            Time control
            {lockTimeControl && <Lock className="size-3.5 text-muted-foreground" aria-hidden />}
          </legend>
          <div className="grid grid-cols-4 gap-2" role="radiogroup" aria-label="Time control">
            {PRESETS.map((p) => {
              const [pm, pi] = p.split("+");
              const active = !showCustom && pm === minutes && pi === increment;
              return (
                <Chip
                  key={p}
                  active={active}
                  onClick={() => {
                    setCustom(false);
                    setMinutes(pm);
                    setIncrement(pi);
                  }}
                >
                  <span className="font-mono text-[15px] font-bold tabular-nums">{p}</span>
                  <span className="text-[11px] font-semibold text-muted-foreground">{speedLabel(Number(pm))}</span>
                </Chip>
              );
            })}
            <Chip active={showCustom} onClick={() => setCustom(true)}>
              <span className="text-[14px] font-bold">Custom</span>
              <span className="text-[11px] font-semibold text-muted-foreground">your own</span>
            </Chip>
          </div>
          {showCustom && (
            <div className="grid grid-cols-2 gap-3 pt-2">
              <FieldBlock id="t-min" label="Minutes per player" small error={errs.minutes}>
                <Input
                  id="t-min"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={180}
                  value={minutes}
                  onChange={(e) => setMinutes(e.target.value)}
                  className="font-mono"
                  aria-invalid={Boolean(errs.minutes) || undefined}
                  aria-describedby={errs.minutes ? "t-min-error" : undefined}
                />
              </FieldBlock>
              <FieldBlock id="t-inc" label="Increment (seconds)" small error={errs.increment}>
                <Input
                  id="t-inc"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={60}
                  value={increment}
                  onChange={(e) => setIncrement(e.target.value)}
                  className="font-mono"
                  aria-invalid={Boolean(errs.increment) || undefined}
                  aria-describedby={errs.increment ? "t-inc-error" : undefined}
                />
              </FieldBlock>
            </div>
          )}
          {lockTimeControl && (
            <p className="text-[12px] text-muted-foreground">Locked once games have started.</p>
          )}
        </fieldset>

        <FieldBlock id="t-start" label="Starts" error={errs.startsAt}>
          <Input
            id="t-start"
            type="datetime-local"
            size="lg"
            value={startsAt}
            onChange={(e) => setStartsAt(e.target.value)}
            required
            className="font-mono"
            aria-invalid={Boolean(errs.startsAt) || undefined}
            aria-describedby={errs.startsAt ? "t-start-error" : "t-start-tz"}
          />
          {!errs.startsAt && (
            <p id="t-start-tz" className="font-mono text-[12px] text-muted-foreground">
              Your time zone: {localTimeZone()}
            </p>
          )}
        </FieldBlock>

        {!initial && (
          <div className="space-y-2">
            <p id="t-status-label" className="text-[13px] font-bold">
              Visibility
            </p>
            <div role="radiogroup" aria-labelledby="t-status-label" className="grid grid-cols-2 gap-1 rounded-xl bg-surface-inset p-1">
              {(
                [
                  ["draft", "Save as draft", "Hidden from students"],
                  ["open", "Open for students now", "They can join straight away"],
                ] as const
              ).map(([value, label, sub]) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={status === value}
                  onClick={() => setStatus(value)}
                  className={cn(
                    "focus-ring flex min-h-14 flex-col items-start justify-center rounded-lg px-3 py-2 text-left transition-colors",
                    status === value ? "bg-card shadow-card" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <span className="text-[14px] font-bold">{label}</span>
                  <span className="text-[12px] text-muted-foreground">{sub}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col-reverse gap-2 border-t border-border bg-surface-raised p-6 max-sm:pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:flex-row sm:justify-end sm:rounded-b-2xl">
        {onCancel && (
          <Button type="button" variant="ghost" size="lg" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" size="lg" loading={pending}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}

function FieldBlock({
  id,
  label,
  hint,
  small,
  error,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  small?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className={cn("font-bold", small ? "text-[12px] text-muted-foreground" : "text-[13px]")}>
        {label}
        {hint && <span className="font-medium text-muted-foreground">({hint})</span>}
      </Label>
      {children}
      {error && (
        <p id={`${id}-error`} className="text-[13px] font-semibold text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onClick}
      className={cn(
        "focus-ring flex h-14 flex-col items-center justify-center gap-0.5 rounded-xl border bg-card transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        active ? "border-primary bg-primary-soft ring-2 ring-primary" : "border-border-strong hover:bg-surface-inset",
      )}
    >
      {children}
    </button>
  );
}
