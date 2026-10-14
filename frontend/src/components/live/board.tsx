"use client";

import { Loader2 } from "lucide-react";
import { Chessboard, type ChessboardOptions } from "react-chessboard";
import {
  alphaNotationStyle,
  buildSquareStyles,
  darkSquareNotationStyle,
  darkSquareStyle,
  draggingPieceGhostStyle,
  draggingPieceStyle,
  dropSquareStyle,
  lightSquareNotationStyle,
  lightSquareStyle,
  numericNotationStyle,
} from "@/lib/board-theme";
import type { Color } from "@/lib/types";
import { cn } from "@/lib/utils";

/** What the bezel says about the game: my move (orange ring), replay (orange frame), or the outcome tint. */
export type BoardHighlight = "my-turn" | "reviewing" | "win" | "draw" | null;

/**
 * The navy-bezelled board (design spec §3.4). Purely presentational: the page owns every rule about
 * who may move what; this only renders styles and forwards react-chessboard events.
 */
export function Board({
  id,
  position,
  orientation,
  lastMove,
  checkSquare,
  selected,
  legalTargets,
  highlight,
  interactive,
  reconnecting,
  allowDragging,
  canDragPiece,
  onPieceDrop,
  onPieceDrag,
  onSquareClick,
  className,
}: {
  id: string;
  position: string;
  orientation: Color;
  lastMove: { from: string; to: string } | null;
  checkSquare: string | null;
  selected: string | null;
  legalTargets: { square: string; capture: boolean }[];
  highlight: BoardHighlight;
  /** Show the pointer affordance (it's my move and I can play). */
  interactive: boolean;
  /** Socket dropped mid-game: dim the board and explain. */
  reconnecting: boolean;
  allowDragging: boolean;
  canDragPiece: ChessboardOptions["canDragPiece"];
  onPieceDrop: ChessboardOptions["onPieceDrop"];
  onPieceDrag: ChessboardOptions["onPieceDrag"];
  onSquareClick: ChessboardOptions["onSquareClick"];
  className?: string;
}) {
  const reviewing = highlight === "reviewing";
  const squareStyles = buildSquareStyles({ lastMove, checkSquare, selected, legalTargets });

  return (
    <div
      data-highlight={highlight ?? "none"}
      className={cn(
        "relative w-full max-w-full bg-board-frame p-1 shadow-raised transition-[box-shadow,background-color] duration-300 ease-out-soft sm:rounded-2xl sm:p-2",
        highlight === "my-turn" && "ring-4 ring-brand-orange/60 max-sm:ring-inset",
        reviewing && "bg-brand-orange",
        // Outcome tint lands a beat after the final move.
        highlight === "win" && "ring-4 ring-win delay-[400ms] max-sm:ring-inset",
        highlight === "draw" && "ring-4 ring-draw/50 delay-[400ms] max-sm:ring-inset",
        className,
      )}
    >
      {reviewing && (
        <span className="absolute -top-3 left-4 z-10 inline-flex h-6 items-center rounded-full bg-brand-orange px-2.5 text-[11px] font-extrabold tracking-[0.12em] text-brand-orange-foreground uppercase shadow-raised ring-2 ring-background">
          Replay mode
        </span>
      )}
      <div
        className={cn(
          "relative overflow-hidden sm:rounded-[10px]",
          interactive ? "[&_[data-square]]:cursor-pointer" : "[&_[data-square]]:cursor-default",
        )}
      >
        <Chessboard
          options={{
            id,
            position,
            boardOrientation: orientation,
            allowDragging,
            canDragPiece,
            onPieceDrop,
            onPieceDrag,
            onSquareClick,
            squareStyles,
            lightSquareStyle,
            darkSquareStyle,
            lightSquareNotationStyle,
            darkSquareNotationStyle,
            alphaNotationStyle,
            numericNotationStyle,
            showNotation: true,
            dropSquareStyle,
            draggingPieceStyle,
            draggingPieceGhostStyle,
            animationDurationInMs: 150,
          }}
        />
        {reconnecting && (
          <div
            role="status"
            className="absolute inset-0 z-20 grid place-items-center bg-background/70 p-4 backdrop-blur-[2px] animate-in fade-in-0 sm:rounded-[10px]"
          >
            <div className="max-w-xs rounded-xl bg-card px-5 py-4 text-center shadow-pop">
              <Loader2 className="mx-auto size-6 animate-spin text-primary" aria-hidden />
              <p className="mt-2 text-h3">Reconnecting…</p>
              <p className="mt-1 text-[13px] text-muted-foreground">
                Hang tight. Your clock is safe on the server and the game will continue right where it left off.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
