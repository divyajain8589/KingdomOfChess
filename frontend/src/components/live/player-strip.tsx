import { ChessClock } from "@/components/live/chess-clock";
import { PlayerAvatar } from "@/components/player-avatar";
import { Piece } from "@/components/states";
import type { SideMaterial } from "@/lib/material";
import type { Color, PlayerRef } from "@/lib/types";
import { cn } from "@/lib/utils";

const PIECE_NAME: Record<string, string> = { Q: "queen", R: "rook", B: "bishop", N: "knight", P: "pawn" };

function capturedLabel(captured: string[]) {
  const counts = new Map<string, number>();
  for (const code of captured) counts.set(code[1], (counts.get(code[1]) ?? 0) + 1);
  return [...counts]
    .map(([t, n]) => `${n} ${PIECE_NAME[t]}${n > 1 ? "s" : ""}`)
    .join(", ");
}

/**
 * One side of the board: avatar with colour chip, name (+ "You"), captured pieces, and the clock.
 * No card box, so the board stays the hero.
 */
export function PlayerStrip({
  player,
  color,
  isYou,
  material,
  clock,
  className,
}: {
  player: PlayerRef;
  color: Color;
  isYou: boolean;
  material: SideMaterial;
  clock: { ms: number; running: boolean; receivedAt: number; active: boolean; gameOver: boolean };
  className?: string;
}) {
  const colorName = color === "white" ? "White" : "Black";
  return (
    <div data-player-color={color} className={cn("flex items-center gap-3 py-2", className)}>
      <PlayerAvatar name={player.name} userId={player.id} color={color} size="md" />
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate text-[15px] font-bold">{player.name}</span>
          {isYou && (
            <span className="shrink-0 rounded-full bg-primary px-1.5 py-px text-[10px] font-extrabold tracking-wide text-primary-foreground uppercase">
              You
            </span>
          )}
        </div>
        <div className="flex h-4 min-w-0 items-center gap-2 text-[12px] text-muted-foreground">
          <span className="shrink-0 font-semibold">{colorName}</span>
          {material.captured.length > 0 && (
            <>
              <span className="flex min-w-0 items-center overflow-hidden pl-1.5" title={`Captured ${capturedLabel(material.captured)}`}>
                <span className="sr-only">Captured {capturedLabel(material.captured)}</span>
                {material.captured.map((code, i) => (
                  <Piece key={i} code={code} className="-ml-1.5 size-4" />
                ))}
              </span>
              {material.advantage > 0 && (
                <span className="shrink-0 font-mono font-bold tabular-nums">
                  +{material.advantage}
                  <span className="sr-only"> material</span>
                </span>
              )}
            </>
          )}
        </div>
      </div>
      <ChessClock
        {...clock}
        label={`${player.name} (${colorName}) clock`}
        announce={isYou}
      />
    </div>
  );
}
