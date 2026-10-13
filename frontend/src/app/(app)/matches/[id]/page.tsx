"use client";

import { Chess, type Square } from "chess.js";
import { ArrowLeft, Eye, Flag, Handshake, WifiOff } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";
import { Chessboard } from "react-chessboard";
import { FindOpponent } from "@/components/find-opponent";
import { ChessClock } from "@/components/live/chess-clock";
import { MoveList } from "@/components/live/move-list";
import { useConnectionState } from "@/components/socket-provider";
import { ErrorState, LoadingState } from "@/components/states";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useLiveMatch } from "@/hooks/use-live-match";
import { describeResult, outcomeFor } from "@/lib/format";
import { useMe, useTournament } from "@/lib/queries";
import type { Color, MatchState } from "@/lib/types";
import { cn } from "@/lib/utils";

type PromotionPiece = "q" | "r" | "b" | "n";

const PROMOTIONS: { piece: PromotionPiece; name: string; white: string; black: string }[] = [
  { piece: "q", name: "queen", white: "♕", black: "♛" },
  { piece: "r", name: "rook", white: "♖", black: "♜" },
  { piece: "b", name: "bishop", white: "♗", black: "♝" },
  { piece: "n", name: "knight", white: "♘", black: "♞" },
];

/** True if moving from→to in this position is a legal pawn promotion. */
function isPromotionMove(fen: string, from: string, to: string): boolean {
  try {
    return new Chess(fen).moves({ square: from as Square, verbose: true }).some((m) => m.to === to && !!m.promotion);
  } catch {
    return false;
  }
}

export default function MatchPage() {
  const { id } = useParams<{ id: string }>();
  const me = useMe();
  const live = useLiveMatch(id);

  if (live.isLoading || me.isPending) return <LoadingState rows={6} />;
  if (live.error || !live.state || !me.data) {
    return <ErrorState error={live.error ?? me.error} onRetry={live.refetch} className="mx-auto max-w-md" />;
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
  const myColor: Color | null = state.white.id === userId ? "white" : state.black.id === userId ? "black" : null;
  const orientation: Color = myColor ?? "white";
  const isLive = state.status === "ongoing";
  const [viewPly, setViewPly] = useState<number | null>(null);
  const [selected, setSelected] = useState<Square | null>(null);
  const [promotionRequest, setPromotionRequest] = useState<{ from: string; to: string; fen: string } | null>(null);

  // Position after each ply, for move-list navigation.
  const fens = useMemo(() => {
    const c = new Chess();
    const out = [c.fen()];
    for (const san of state.moves) {
      c.move(san);
      out.push(c.fen());
    }
    return out;
  }, [state.moves]);

  const reviewing = viewPly !== null && viewPly < state.moves.length;
  const displayedFen = reviewing ? fens[viewPly] : (live.pendingFen ?? state.fen);
  const myTurn = isLive && !!myColor && state.turn === myColor && !live.pendingFen;
  const canInteract = myTurn && !reviewing && conn === "connected";

  const legalTargets = useMemo(() => {
    if (!selected || !canInteract) return [];
    return new Chess(state.fen).moves({ square: selected, verbose: true }).map((m) => m.to);
  }, [selected, canInteract, state.fen]);

  // Colours for last move, images for check/legal-move dots, so the layers combine.
  const squareStyles: Record<string, React.CSSProperties> = {};
  const style = (sq: string, css: React.CSSProperties) => (squareStyles[sq] = { ...squareStyles[sq], ...css });
  if (state.lastMove && !reviewing) {
    style(state.lastMove.from, { backgroundColor: "rgba(249, 115, 22, 0.35)" });
    style(state.lastMove.to, { backgroundColor: "rgba(249, 115, 22, 0.45)" });
  }
  if (state.inCheck && !reviewing) {
    const kingSq = findKing(state.fen, state.turn);
    if (kingSq) style(kingSq, { backgroundImage: "radial-gradient(circle, rgba(220,38,38,.85) 30%, transparent 75%)" });
  }
  if (selected) style(selected, { boxShadow: "inset 0 0 0 3px rgba(11, 58, 102, .8)" });
  for (const sq of legalTargets) {
    style(sq, { backgroundImage: "radial-gradient(circle, rgba(11,58,102,.35) 22%, transparent 24%)" });
  }

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

  const top = orientation === "white" ? "black" : "white";
  const bottom = orientation;
  const player = (c: Color) => (c === "white" ? state.white : state.black);
  const clockProps = (c: Color) => ({
    ms: c === "white" ? state.clock.whiteMs : state.clock.blackMs,
    running: state.clock.running === c,
    receivedAt: live.receivedAt,
    name: player(c).name + (player(c).id === userId ? " (you)" : ""),
    sub: c === "white" ? "White" : "Black",
    active: isLive && state.turn === c,
  });

  const opponentOffered = isLive && myColor && state.drawOfferBy && state.drawOfferBy !== myColor;
  const iOffered = isLive && myColor && state.drawOfferBy === myColor;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href={isCoach ? `/coach/tournaments/${state.tournamentId}` : `/student/tournaments/${state.tournamentId}`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> {state.tournamentName}
        </Link>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="font-mono">
            {state.timeControl}
          </Badge>
          {!myColor && (
            <Badge variant="secondary">
              <Eye /> Spectating
            </Badge>
          )}
          {isLive ? <Badge className="bg-orange-500 text-white">LIVE</Badge> : <Badge variant="secondary">Finished</Badge>}
        </div>
      </div>

      {conn !== "connected" && isLive && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-2 text-sm">
          <WifiOff className="size-4 text-destructive" /> Connection lost — reconnecting. Clocks keep running on the server.
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="mx-auto w-full max-w-[min(640px,calc(100vh-14rem))] space-y-2">
          <ChessClock {...clockProps(top)} />
          <div className={cn("overflow-hidden rounded-md shadow-sm", reviewing && "opacity-90 ring-2 ring-amber-400")}>
            <Chessboard
              options={{
                id: `match-${state.matchId}`,
                position: displayedFen,
                boardOrientation: orientation,
                allowDragging: canInteract && !pendingPromotion,
                canDragPiece: ({ piece }) => canInteract && !pendingPromotion && ownsPiece(piece.pieceType),
                onPieceDrop: ({ sourceSquare, targetSquare }) =>
                  targetSquare && !pendingPromotion ? tryMove(sourceSquare, targetSquare) : false,
                onPieceDrag: ({ square }) => setSelected(square as Square | null),
                onSquareClick: ({ piece, square }) => {
                  if (!canInteract || pendingPromotion) return;
                  if (selected && legalTargets.includes(square as Square)) {
                    tryMove(selected, square);
                  } else if (piece && ownsPiece(piece.pieceType)) {
                    setSelected(square as Square);
                  } else {
                    setSelected(null);
                  }
                },
                squareStyles,
                darkSquareStyle: { backgroundColor: "#6b8fb3" },
                lightSquareStyle: { backgroundColor: "#eef2f7" },
                animationDurationInMs: 150,
              }}
            />
          </div>
          <ChessClock {...clockProps(bottom)} />
          <Dialog open={!!pendingPromotion} onOpenChange={(open) => !open && setPendingPromotion(null)}>
            <DialogContent className="sm:max-w-xs" showCloseButton={false}>
              <DialogHeader>
                <DialogTitle>Promote pawn</DialogTitle>
                <DialogDescription>Choose a piece for your pawn on {pendingPromotion?.to}.</DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-4 gap-2">
                {PROMOTIONS.map((p) => (
                  <Button
                    key={p.piece}
                    variant="outline"
                    className="h-16"
                    onClick={() => choosePromotion(p.piece)}
                    aria-label={`Promote to ${p.name}`}
                    title={p.name[0].toUpperCase() + p.name.slice(1)}
                  >
                    <span aria-hidden className="text-5xl leading-none">
                      {myColor === "black" ? p.black : p.white}
                    </span>
                  </Button>
                ))}
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setPendingPromotion(null)}>
                  Cancel
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          {reviewing && (
            <div className="flex items-center justify-between rounded-md bg-amber-50 px-3 py-1.5 text-sm dark:bg-amber-950/40">
              <span>
                Reviewing move {viewPly} of {state.moves.length}
              </span>
              <Button size="xs" variant="outline" onClick={() => setViewPly(null)}>
                Back to {isLive ? "live" : "final"} position
              </Button>
            </div>
          )}
        </div>

        <div className="space-y-4">
          {!isLive && <GameOver state={state} myColor={myColor} isCoach={isCoach} />}

          {isLive && myColor && (
            <Card>
              <CardContent className="space-y-3">
                <div className="text-center text-lg font-semibold">
                  {live.pendingFen ? "Sending move…" : myTurn ? "Your move" : "Opponent's move"}
                </div>
                {opponentOffered && (
                  <div className="space-y-2 rounded-md border border-sky-300 bg-sky-50 p-3 text-sm dark:border-sky-800 dark:bg-sky-950/40">
                    <div className="font-medium">Your opponent offers a draw.</div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => live.respondDraw(true)}>
                        Accept
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => live.respondDraw(false)}>
                        Decline
                      </Button>
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" onClick={live.offerDraw} disabled={!!iOffered || conn !== "connected"}>
                    <Handshake /> {iOffered ? "Draw offered" : "Offer draw"}
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" className="text-destructive" disabled={conn !== "connected"}>
                        <Flag /> Resign
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Resign this game?</AlertDialogTitle>
                        <AlertDialogDescription>Your opponent will be awarded the win.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Keep playing</AlertDialogCancel>
                        <AlertDialogAction variant="destructive" onClick={live.resign}>
                          Resign
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Moves</CardTitle>
            </CardHeader>
            <CardContent>
              <MoveList moves={state.moves} pgn={state.pgn} viewPly={viewPly} onView={setViewPly} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function GameOver({ state, myColor, isCoach }: { state: MatchState; myColor: Color | null; isCoach: boolean }) {
  const tournament = useTournament(state.tournamentId);
  const canRequeue = !!myColor && tournament.data?.status === "ongoing";
  const outcome = outcomeFor(state.result, myColor);
  const headline =
    outcome === "win" ? "You won! 🎉" : outcome === "loss" ? "Good game!" : outcome === "draw" ? "It's a draw" : "Game over";

  return (
    <Card
      className={cn(
        outcome === "win" && "border-emerald-400",
        outcome === "loss" && "border-destructive/40",
        outcome === "draw" && "border-sky-400",
      )}
    >
      <CardContent className="space-y-3 text-center">
        <div className="text-2xl font-bold">{headline}</div>
        <div className="text-muted-foreground">{describeResult(state.result, state.termination)}</div>
        {outcome === "loss" && <div className="text-sm">Every game makes you stronger — try the next one!</div>}
        <div className="flex flex-col items-center gap-2 pt-1">
          {canRequeue && <FindOpponent tournamentId={state.tournamentId} size="default" />}
          <Button asChild variant="outline" className="w-full">
            <Link href={isCoach ? `/coach/tournaments/${state.tournamentId}` : `/student/tournaments/${state.tournamentId}`}>
              View leaderboard
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
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
