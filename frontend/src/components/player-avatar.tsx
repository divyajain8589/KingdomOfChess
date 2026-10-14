import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { Color } from "@/lib/types";
import { cn } from "@/lib/utils";

const TONES = [
  "bg-primary-soft text-primary",
  "bg-brand-orange-soft text-brand-orange-ink",
  "bg-success-soft text-success",
  "bg-gold-soft text-gold-ink",
  "bg-info-soft text-info",
  "bg-draw-soft text-draw",
] as const;

const SIZES = {
  sm: "size-7 text-[11px]",
  md: "size-9 text-[13px]",
  lg: "size-12 text-[16px]",
} as const;

/** Two-letter initials: first + last word ("Kabir Singh" → "KS", "Diya" → "DI"). */
export function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Stable colour pair for a user id (sum of char codes mod 6). */
export function avatarTone(userId: string) {
  let sum = 0;
  for (let i = 0; i < userId.length; i++) sum += userId.charCodeAt(i);
  return TONES[sum % TONES.length];
}

/**
 * Initials avatar coloured by `userId`. `size`: sm 28px | md 36px | lg 48px.
 * `color` adds a white/black piece chip bottom-right (match page). `ring` adds a card-coloured ring for overlapping stacks.
 * Decorative by default (aria-hidden); the name should be shown next to it.
 */
export function PlayerAvatar({
  name,
  userId,
  size = "md",
  color,
  ring = false,
  className,
}: {
  name: string;
  userId: string;
  size?: "sm" | "md" | "lg";
  color?: Color;
  ring?: boolean;
  className?: string;
}) {
  return (
    <span aria-hidden className={cn("relative inline-flex shrink-0", className)}>
      <Avatar className={cn("after:hidden", SIZES[size], ring && "ring-2 ring-card")}>
        <AvatarFallback className={cn("font-extrabold tracking-tight", SIZES[size], avatarTone(userId))}>
          {initials(name)}
        </AvatarFallback>
      </Avatar>
      {color && (
        <span
          className={cn(
            "absolute -right-0.5 -bottom-0.5 size-3 rounded-full ring-1 ring-border-strong",
            color === "white" ? "bg-white" : "bg-foreground",
            "shadow-[0_0_0_2px_var(--background)]",
          )}
        />
      )}
    </span>
  );
}
