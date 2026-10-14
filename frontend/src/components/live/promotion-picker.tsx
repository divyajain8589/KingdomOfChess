"use client";

import { Piece } from "@/components/states";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Color } from "@/lib/types";

export type PromotionPiece = "q" | "r" | "b" | "n";

const CHOICES: { piece: PromotionPiece; name: string; key: string }[] = [
  { piece: "q", name: "Queen", key: "q" },
  { piece: "r", name: "Rook", key: "r" },
  { piece: "b", name: "Bishop", key: "b" },
  { piece: "n", name: "Knight", key: "n" },
];

/**
 * "Pick your new piece" dialog, shown only when a move promotes. Choosing calls `onChoose`;
 * Esc / Undo calls `onCancel` and leaves the board as it was. Keys Q, R, B, N pick directly.
 */
export function PromotionPicker({
  open,
  color,
  square,
  onChoose,
  onCancel,
}: {
  open: boolean;
  color: Color;
  square?: string;
  onChoose: (piece: PromotionPiece) => void;
  onCancel: () => void;
}) {
  const prefix = color === "white" ? "w" : "b";
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent
        className="sm:max-w-sm"
        showCloseButton={false}
        onKeyDown={(e) => {
          if (e.altKey || e.ctrlKey || e.metaKey) return;
          const choice = CHOICES.find((c) => c.key === e.key.toLowerCase());
          if (choice) {
            e.preventDefault();
            onChoose(choice.piece);
          }
        }}
      >
        <DialogHeader className="pr-0">
          <p className="eyebrow">— Promotion{square ? ` on ${square}` : ""}</p>
          <DialogTitle>Pick your new piece</DialogTitle>
          <DialogDescription>Your pawn made it to the end!</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-4 gap-3">
          {/* Radix focuses the first button (Queen) on open. */}
          {CHOICES.map((c) => (
            <button
              key={c.piece}
              type="button"
              onClick={() => onChoose(c.piece)}
              aria-label={`Promote to ${c.name.toLowerCase()}`}
              className="focus-ring group flex flex-col items-center gap-1.5 rounded-xl"
            >
              <span className="grid aspect-square w-full max-w-18 place-items-center rounded-xl border-2 border-border bg-surface-raised transition-colors duration-150 group-hover:border-primary group-hover:bg-primary-soft">
                <Piece code={`${prefix}${c.piece.toUpperCase()}`} className="size-[78%]" />
              </span>
              <span className="text-[13px] font-bold text-foreground">
                {c.name}
                <kbd className="ml-1 hidden font-mono text-[11px] font-semibold text-muted-foreground sm:inline">{c.key.toUpperCase()}</kbd>
              </span>
            </button>
          ))}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onCancel}>
            Undo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
