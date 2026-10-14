import type { Color } from "./types";

/** Lower-case piece letter as in FEN. */
type PieceType = "p" | "n" | "b" | "r" | "q";

const START: Record<PieceType, number> = { p: 8, n: 2, b: 2, r: 2, q: 1 };
const VALUE: Record<PieceType, number> = { p: 1, n: 3, b: 3, r: 5, q: 9 };
/** Display order: most valuable first. */
const ORDER: PieceType[] = ["q", "r", "b", "n", "p"];

export interface SideMaterial {
  /** Opponent pieces this side has taken, as react-chessboard piece codes ("bQ", "wP", …), queen first. */
  captured: string[];
  /** Material lead in pawns (0 when level or behind). */
  advantage: number;
}

function count(fen: string): Record<Color, Record<PieceType, number>> {
  const out: Record<Color, Record<PieceType, number>> = {
    white: { p: 0, n: 0, b: 0, r: 0, q: 0 },
    black: { p: 0, n: 0, b: 0, r: 0, q: 0 },
  };
  for (const ch of fen.split(" ")[0] ?? "") {
    const lower = ch.toLowerCase() as PieceType;
    if (!(lower in START)) continue;
    out[ch === lower ? "black" : "white"][lower]++;
  }
  return out;
}

/**
 * Captured pieces per side, derived from a FEN by comparing against the starting set.
 * Promotions are accounted for: a piece above its starting count must have been a pawn, so it isn't
 * shown as a captured pawn.
 */
export function materialFromFen(fen: string): Record<Color, SideMaterial> {
  const c = count(fen);
  const score = (side: Color) => ORDER.reduce((sum, t) => sum + c[side][t] * VALUE[t], 0);

  const missing = (side: Color): string[] => {
    const prefix = side === "white" ? "w" : "b";
    const promoted = (["n", "b", "r", "q"] as const).reduce((n, t) => n + Math.max(0, c[side][t] - START[t]), 0);
    const pieces: string[] = [];
    for (const t of ORDER) {
      let gone = Math.max(0, START[t] - c[side][t]);
      if (t === "p") gone = Math.max(0, gone - promoted);
      for (let i = 0; i < gone; i++) pieces.push(prefix + t.toUpperCase());
    }
    return pieces;
  };

  const diff = score("white") - score("black");
  return {
    white: { captured: missing("black"), advantage: Math.max(0, diff) },
    black: { captured: missing("white"), advantage: Math.max(0, -diff) },
  };
}
