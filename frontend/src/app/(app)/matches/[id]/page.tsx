"use client";

import { Chess, type Square } from "chess.js";
import { ArrowLeft, ArrowUpDown, Eye } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Board, type BoardHighlight } from "@/components/live/board";
import { GameOver } from "@/components/live/game-over";
import { IncomingDrawOffer, MatchControls } from "@/components/live/match-controls";
import { MoveList } from "@/components/live/move-list";
import { PlayerStrip } from "@/components/live/player-strip";
import { PromotionPicker, type PromotionPiece } from "@/components/live/promotion-picker";
import { TurnBanner, type TurnBannerMode } from "@/components/live/turn-banner";
import { useConnectionState } from "@/components/socket-provider";
import { ErrorState, MatchSkeleton } from "@/components/states";
import { LivePill, StatusPill } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useLiveMatch } from "@/hooks/use-live-match";
import { errorMessage } from "@/lib/api";
import { describeResult, outcomeFor } from "@/lib/format";
import { materialFromFen } from "@/lib/material";
import { useMe } from "@/lib/queries";
import type { Color, MatchState } from "@/lib/types";

/** True if moving from→to in this position is a legal pawn promotion. */
function isPromotionMove(fen: string, from: string, to: string): boolean {
  try {
    return new Chess(fen).moves({ square: from as Square, verbose: true }).some((m) => m.to === to && !!m.promotion);
  } catch {
    return false;
  }
}

function findKing(fen: string, color: Color): string | null {
  const board = new Chess(fen).board();
  for (const row of board) {
    for (const sq of row) {
      if (sq && sq.type === "k" && sq.color === color[0]) return sq.square;
    }
  }
  return null;
}

const firstName = (name: string) => name.split(/\s+/)[0] || name;

export default function MatchPage() {
  const { id } = useParams<{ id: string }>();
  const me = useMe();
  const live = useLiveMatch(id);

  if (live.isLoading || me.isPending) return <MatchSkeleton />;
  if (live.error || !live.state || !me.data) {
    const err = live.error ?? me.error;
    return (
      <ErrorState
        error={err}
        onRetry={live.refetch}
        title="We couldn't open this game"
        description={`${errorMessage(err).replace(/\.?$/, ".")} It may have been removed, or the link is wrong.`}
        action={
          <Button asChild variant="ghost" size="lg">
            <Link href={me.data?.role === "coach" ? "/coach" : "/student"}>
              <ArrowLeft /> Back to tournaments
            </Link>
          </Button>
        }
        className="mx-auto mt-6 max-w-md"
      />
    );
  }
  return <Match live={live} state={live.state} userId={me.data.id} isCoach={me.data.role === "coach"} />;
}

function Match({
  live,
  state,
  userId,
  isCoach,
}: {
  live: ReturnType<typeof useLiveMatch>;
  state: MatchState;
  userId: string;
  isCoach: boolean;
}) {
  const conn = useConnectionState();
  const connected = conn === "connected";
  const myColor: Color | null = state.white.id === userId ? "white" : state.black.id === userId ? "black" : null;
  const [flipped, setFlipped] = useState(false);
  const orientation: Color = myColor ?? (flipped ? "black" : "white");
  const isLive = state.status === "ongoing";
  const [viewPly, setViewPly] = useState<number | null>(null);
  const [selected, setSelected] = useState<Square | null>(null);
  const boardColumnRef = useRef<HTMLDivElement>(null);
  const [promotionRequest, setPromotionRequest] = useState<{ from: string; to: string; fen: string } | null>(null);

  // "Back online!" once the socket recovers after a drop (not on the first connect).
  const prevConn = useRef(conn);
  const wasConnected = useRef(conn === "connected");
  useEffect(() => {
    if (conn === "connected" && prevConn.current !== "connected" && wasConnected.current) toast.success("Back online!");
    if (conn === "connected") wasConnected.current = true;
    prevConn.current = conn;
  }, [conn]);

  // Position and last move after each ply, for move-list navigation.
  const history = useMemo(() => {
    const c = new Chess();
    const fens = [c.fen()];
    const lastMoves: ({ from: string; to: string } | null)[] = [null];
    for (const san of state.moves) {
      const m = c.move(san);
      fens.push(c.fen());
      lastMoves.push({ from: m.from, to: m.to });
    }
    return { fens, lastMoves };
  }, [state.moves]);

  const reviewing = viewPly !== null && viewPly < state.moves.length;
  const displayedFen = reviewing ? history.fens[viewPly] : (live.pendingFen ?? state.fen);
  const myTurn = isLive && !!myColor && state.turn === myColor && !live.pendingFen;
  const canInteract = myTurn && !reviewing && connected;

  const legalTargets = useMemo(() => {
    if (!selected || !canInteract) return [];
    return new Chess(state.fen)
      .moves({ square: selected, verbose: true })
      .map((m) => ({ square: m.to as string, capture: !!m.captured }));
  }, [selected, canInteract, state.fen]);

  const checkSquare = useMemo(() => {
    if (reviewing) {
      const c = new Chess(displayedFen);
      return c.inCheck() ? findKing(displayedFen, c.turn() === "w" ? "white" : "black") : null;
    }
    return state.inCheck ? findKing(state.fen, state.turn) : null;
  }, [reviewing, displayedFen, state.inCheck, state.fen, state.turn]);

  const material = useMemo(() => materialFromFen(displayedFen), [displayedFen]);

  const ownsPiece = (pieceType: string) => !!myColor && pieceType[0] === myColor[0];

  // A promotion choice only stands while the position it was made in is still current and it's still my move.
  const pendingPromotion =
    promotionRequest && canInteract && promotionRequest.fen === state.fen ? promotionRequest : null;
  const setPendingPromotion = (p: { from: string; to: string } | null) =>
    setPromotionRequest(p && { ...p, fen: state.fen });

  function tryMove(from: string, to: string) {
    setSelected(null);
    if (isPromotionMove(state.fen, from, to)) {
      // Ask which piece first; returning false snaps the pawn back until then.
      setPendingPromotion({ from, to });
      return false;
    }
    return live.move(from, to);
  }

  function choosePromotion(piece: PromotionPiece) {
    if (!pendingPromotion) return;
    const { from, to } = pendingPromotion;
    setPendingPromotion(null);
    live.move(from, to, piece);
  }

  const top: Color = orientation === "white" ? "black" : "white";
  const bottom: Color = orientation;
  const player = (c: Color) => (c === "white" ? state.white : state.black);
  const opponent = myColor ? player(myColor === "white" ? "black" : "white") : null;
  const opponentName = opponent ? firstName(opponent.name) : "Your opponent";
  const strip = (c: Color, className?: string) => (
    <PlayerStrip
      player={player(c)}
      color={c}
      isYou={player(c).id === userId}
      material={material[c]}
      className={className}
      clock={{
        ms: c === "white" ? state.clock.whiteMs : state.clock.blackMs,
        running: state.clock.running === c,
        receivedAt: live.receivedAt,
        active: isLive && state.turn === c,
        gameOver: !isLive,
      }}
    />
  );

  const opponentOffered = isLive && !!myColor && !!state.drawOfferBy && state.drawOfferBy !== myColor;
  const iOffered = isLive && !!myColor && state.drawOfferBy === myColor;
  const outcome = outcomeFor(state.result, myColor);

  let banner: TurnBannerMode | null = null;
  if (reviewing) {
    banner = { kind: "reviewing", ply: viewPly, total: state.moves.length, live: isLive, onBack: () => setViewPly(null) };
  } else if (isLive) {
    if (!myColor) banner = { kind: "spectating", turn: state.turn, check: state.inCheck };
    else if (live.pendingFen) banner = { kind: "sending" };
    else if (myTurn) banner = { kind: state.inCheck ? "my-check" : "my-turn" };
    else banner = state.inCheck ? { kind: "their-check", opponent: opponentName } : { kind: "thinking", opponent: opponentName };
  }

  const highlight: BoardHighlight = reviewing
    ? "reviewing"
    : isLive
      ? myTurn
        ? "my-turn"
        : null
      : outcome === "win"
        ? "win"
        : outcome === "draw"
          ? "draw"
          : null;

  function replayFromStart() {
    setViewPly(0);
    // Below lg the board sits above the game-over card; bring it back into view.
    if (window.matchMedia("(max-width: 1023px)").matches) {
      const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      boardColumnRef.current?.scrollIntoView({ block: "start", behavior: smooth ? "smooth" : "auto" });
    }
  }

  const backHref = isCoach ? `/coach/tournaments/${state.tournamentId}` : `/student/tournaments/${state.tournamentId}`;

  return (
    <div className="space-y-3 sm:space-y-5">
      {/* Top bar */}
      <div className="flex h-12 items-center justify-between gap-3">
        <Link
          href={backHref}
          className="focus-ring -ml-2 inline-flex h-9 min-w-0 items-center gap-1.5 rounded-full pr-3 pl-2 text-[13px] font-semibold text-muted-foreground transition-colors hover:bg-surface-inset hover:text-foreground"
        >
          <ArrowLeft className="size-4 shrink-0" aria-hidden />
          <span className="truncate">{state.tournamentName}</span>
        </Link>
        <div className="flex shrink-0 items-center gap-2">
          <span className="inline-flex h-7 items-center rounded-full bg-surface-inset px-2.5 font-mono text-[12px] font-bold tabular-nums">
            <span className="sr-only">Time control </span>
            {state.timeControl}
          </span>
          {!myColor && (
            <>
              <span className="inline-flex h-7 items-center gap-1.5 rounded-full bg-info-soft px-2.5 text-[12px] font-bold text-info">
                <Eye className="size-3.5" aria-hidden /> Watching
              </span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon-sm" aria-label="Flip board" onClick={() => setFlipped((f) => !f)}>
                    <ArrowUpDown />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Flip board</TooltipContent>
              </Tooltip>
            </>
          )}
          {isLive ? <LivePill /> : <StatusPill status="completed" label="Finished" />}
        </div>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-5 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-8">
        {/* Board column: full bleed on phones. */}
        <div ref={boardColumnRef} className="-mx-4 scroll-mt-20 sm:mx-auto sm:w-full sm:max-w-[min(680px,calc(100dvh-13rem))]">
          {strip(top, "px-4 sm:px-0")}
          <Board
            id={`match-${state.matchId}`}
            position={displayedFen}
            orientation={orientation}
            lastMove={reviewing ? history.lastMoves[viewPly] : state.lastMove}
            checkSquare={checkSquare}
            selected={selected}
            legalTargets={legalTargets}
            highlight={highlight}
            interactive={canInteract}
            reconnecting={isLive && !connected}
            allowDragging={canInteract && !pendingPromotion}
            canDragPiece={({ piece }) => canInteract && !pendingPromotion && ownsPiece(piece.pieceType)}
            onPieceDrop={({ sourceSquare, targetSquare }) =>
              targetSquare && !pendingPromotion ? tryMove(sourceSquare, targetSquare) : false
            }
            onPieceDrag={({ square }) => setSelected(square as Square | null)}
            onSquareClick={({ piece, square }) => {
              if (!canInteract || pendingPromotion) return;
              if (selected && legalTargets.some((t) => t.square === square)) {
                tryMove(selected, square);
              } else if (piece && ownsPiece(piece.pieceType)) {
                setSelected(square as Square);
              } else {
                setSelected(null);
              }
            }}
          />
          {strip(bottom, "px-4 sm:px-0")}
          {myColor && (
            <PromotionPicker
              open={!!pendingPromotion}
              color={myColor}
              square={pendingPromotion?.to}
              onChoose={choosePromotion}
              onCancel={() => setPendingPromotion(null)}
            />
          )}
        </div>

        {/* Side panel (below the board on small screens). */}
        <div className="space-y-4 lg:sticky lg:top-20">
          {banner && <TurnBanner mode={banner} />}

          {!isLive && (
            <GameOver state={state} myColor={myColor} isCoach={isCoach} onReplay={replayFromStart} />
          )}

          {opponentOffered && (
            <IncomingDrawOffer opponent={opponentName} disabled={!connected} onRespond={live.respondDraw} />
          )}

          {isLive && myColor && (
            <MatchControls
              opponent={opponentName}
              connected={connected}
              iOffered={iOffered}
              onOfferDraw={live.offerDraw}
              onResign={live.resign}
            />
          )}

          <MoveList moves={state.moves} pgn={state.pgn} viewPly={viewPly} onView={setViewPly} />
        </div>
      </div>

      <p className="sr-only" aria-live="polite">
        {isLive ? "" : `Game over. ${describeResult(state.result, state.termination)}.`}
      </p>
    </div>
  );
}
