import type { CSSProperties } from "react";

/**
 * "Academy Notebook" board theme for react-chessboard v5 (design spec §3.4).
 * Colours come from the board tokens in globals.css so the board follows the theme.
 */

const INK = "oklch(0.248 0.049 253.4";

/** a1 is dark: (file + rank) even → dark. */
export function isDarkSquare(square: string): boolean {
  const file = square.charCodeAt(0) - 96; // a = 1
  const rank = Number(square[1]);
  return (file + rank) % 2 === 0;
}

export const lightSquareStyle: CSSProperties = { backgroundColor: "var(--board-light)" };
export const darkSquareStyle: CSSProperties = { backgroundColor: "var(--board-dark)" };

const notation: CSSProperties = {
  fontFamily: "var(--font-geist-mono), ui-monospace, monospace",
  fontSize: 10,
  fontWeight: 600,
};
export const alphaNotationStyle: CSSProperties = { ...notation, bottom: 2, right: 4 };
export const numericNotationStyle: CSSProperties = { ...notation, top: 3, left: 4 };
/** Navy on cream squares, cream on blue squares, so coordinates read on both. */
export const lightSquareNotationStyle: CSSProperties = { color: `${INK} / .55)` };
export const darkSquareNotationStyle: CSSProperties = { color: "oklch(0.967 0.016 79.4 / .85)" };

export const dropSquareStyle: CSSProperties = { boxShadow: "inset 0 0 0 4px var(--brand-orange)" };
export const draggingPieceStyle: CSSProperties = {
  transform: "scale(1.12)",
  filter: `drop-shadow(0 6px 8px ${INK} / .35))`,
};
export const draggingPieceGhostStyle: CSSProperties = { opacity: 0.35 };

/** Full-fill highlight for last-move squares (no muddy overlay on blue squares). */
export const lastMoveFill = (square: string): CSSProperties => ({
  backgroundColor: isDarkSquare(square) ? "var(--board-last-dark)" : "var(--board-last-light)",
});

export const selectedStyle = (square: string): CSSProperties => ({
  ...lastMoveFill(square),
  boxShadow: "inset 0 0 0 3px var(--primary)",
});

export const legalDotImage = `radial-gradient(circle, ${INK} / .32) 17%, transparent 19%)`;
export const legalCaptureImage = `radial-gradient(circle, transparent 60%, ${INK} / .32) 62%, ${INK} / .32) 76%, transparent 78%)`;
export const checkImage =
  "radial-gradient(circle, oklch(0.6 0.22 25 / .95) 0%, oklch(0.6 0.22 25 / .55) 40%, transparent 72%)";

/**
 * Per-square styles. Fills (last move / selected) go in backgroundColor and markers (check, move dots)
 * in backgroundImage so the layers combine instead of overwriting each other.
 */
export function buildSquareStyles({
  lastMove,
  checkSquare,
  selected,
  legalTargets,
}: {
  lastMove?: { from: string; to: string } | null;
  checkSquare?: string | null;
  selected?: string | null;
  legalTargets?: { square: string; capture: boolean }[];
}): Record<string, CSSProperties> {
  const styles: Record<string, CSSProperties> = {};
  const add = (sq: string, css: CSSProperties) => (styles[sq] = { ...styles[sq], ...css });
  if (lastMove) {
    add(lastMove.from, lastMoveFill(lastMove.from));
    add(lastMove.to, lastMoveFill(lastMove.to));
  }
  if (checkSquare) add(checkSquare, { backgroundImage: checkImage });
  if (selected) add(selected, selectedStyle(selected));
  for (const t of legalTargets ?? []) {
    add(t.square, { backgroundImage: t.capture ? legalCaptureImage : legalDotImage });
  }
  return styles;
}
