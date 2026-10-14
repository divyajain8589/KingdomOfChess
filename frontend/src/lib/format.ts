import { format } from "date-fns";
import type { Color, MatchResult, MatchTermination, TournamentStatus } from "./types";

/** Platform-wide format: DD/MM/YYYY, shown in the viewer's own timezone (timestamps are stored in UTC). */
export const formatDate = (iso: string | Date) => format(new Date(iso), "dd/MM/yyyy");
export const formatDateTime = (iso: string | Date) => format(new Date(iso), "dd/MM/yyyy, HH:mm");

/** The viewer's timezone, e.g. "Asia/Kolkata" — shown next to editable times so there's no ambiguity. */
export const localTimeZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

/** Value for <input type="datetime-local"> in local time. */
export function toLocalInputValue(iso: string | Date) {
  return format(new Date(iso), "yyyy-MM-dd'T'HH:mm");
}

/** A datetime-local value is local wall-clock time; convert to an absolute ISO instant. */
export const fromLocalInputValue = (value: string) => new Date(value).toISOString();

export function formatClock(ms: number) {
  const clamped = Math.max(0, ms);
  const totalSeconds = Math.floor(clamped / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  // Tenths in the last 10 seconds, like most chess clocks.
  if (clamped < 10_000) return `${m}:${String(s).padStart(2, "0")}.${Math.floor((clamped % 1000) / 100)}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export const formatPoints = (p: number) => (p % 1 === 0 ? String(p) : `${Math.floor(p) || ""}½`);

export const STATUS_LABEL: Record<TournamentStatus, string> = {
  draft: "Draft",
  open: "Open",
  ongoing: "In progress",
  completed: "Completed",
};

export const TERMINATION_LABEL: Record<MatchTermination, string> = {
  checkmate: "checkmate",
  resignation: "resignation",
  timeout: "time",
  stalemate: "stalemate",
  draw_agreement: "agreement",
  threefold_repetition: "threefold repetition",
  fifty_move_rule: "the 50-move rule",
  insufficient_material: "insufficient material",
};

export const resultScore = (r: MatchResult | null) =>
  r === "white" ? "1–0" : r === "black" ? "0–1" : r === "draw" ? "½–½" : "–";

/** "White won by checkmate" / "Draw by stalemate" / "Draw (Black ran out of time…)" */
export function describeResult(result: MatchResult | null, termination: MatchTermination | null) {
  if (!result || !termination) return "In progress";
  if (result === "draw") {
    if (termination === "timeout") return "Draw: time ran out but the opponent couldn't mate";
    return `Draw by ${TERMINATION_LABEL[termination]}`;
  }
  return `${result === "white" ? "White" : "Black"} won by ${TERMINATION_LABEL[termination]}`;
}

export function outcomeFor(result: MatchResult | null, color: Color | null): "win" | "loss" | "draw" | null {
  if (!result || !color) return null;
  if (result === "draw") return "draw";
  return result === color ? "win" : "loss";
}
