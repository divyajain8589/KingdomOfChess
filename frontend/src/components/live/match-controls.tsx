"use client";

import { Flag, Handshake } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
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
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/** Wraps a control so a disabled-while-offline button still explains itself on hover/focus. */
function OfflineTip({ offline, children }: { offline: boolean; children: React.ReactNode }) {
  if (!offline) return <>{children}</>;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {/* Disabled buttons don't get pointer events; the span carries the tooltip. */}
        <span tabIndex={0} className="focus-ring block rounded-xl">
          {children}
        </span>
      </TooltipTrigger>
      <TooltipContent>Waiting for connection…</TooltipContent>
    </Tooltip>
  );
}

/** "{Opponent} offers a draw" card. Focuses "Keep playing" first so a stray Enter doesn't accept. */
export function IncomingDrawOffer({
  opponent,
  disabled,
  onRespond,
}: {
  opponent: string;
  disabled: boolean;
  onRespond: (accept: boolean) => Promise<void>;
}) {
  const keepRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const descId = useId();
  const [busy, setBusy] = useState<"accept" | "decline" | null>(null);

  useEffect(() => {
    keepRef.current?.focus({ preventScroll: true });
  }, []);

  const respond = async (accept: boolean) => {
    setBusy(accept ? "accept" : "decline");
    try {
      await onRespond(accept);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div
      role="alertdialog"
      aria-labelledby={titleId}
      aria-describedby={descId}
      className="rounded-2xl border-2 border-info bg-info-soft p-4 animate-in fade-in-0 slide-in-from-top-2 duration-300 ease-out-soft"
    >
      <p id={titleId} className="flex items-center gap-2 text-[16px] font-extrabold text-foreground">
        <Handshake className="size-5 shrink-0 text-info" aria-hidden />
        {opponent} offers a draw
      </p>
      <p id={descId} className="mt-1 text-[14px] text-muted-foreground">
        Take it, or keep playing for the win?
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Button size="lg" onClick={() => respond(true)} loading={busy === "accept"} disabled={disabled || !!busy}>
          Accept draw
        </Button>
        <Button
          ref={keepRef}
          size="lg"
          variant="outline"
          onClick={() => respond(false)}
          loading={busy === "decline"}
          disabled={disabled || !!busy}
        >
          Keep playing
        </Button>
      </div>
    </div>
  );
}

/** Offer draw + Resign (with confirm). Players only, live games only. */
export function MatchControls({
  opponent,
  connected,
  iOffered,
  onOfferDraw,
  onResign,
  className,
}: {
  opponent: string;
  connected: boolean;
  iOffered: boolean;
  onOfferDraw: () => Promise<void>;
  onResign: () => Promise<void>;
  className?: string;
}) {
  const [offering, setOffering] = useState(false);
  const offline = !connected;

  const offer = async () => {
    setOffering(true);
    try {
      await onOfferDraw();
    } finally {
      setOffering(false);
    }
  };

  return (
    <div className={cn("space-y-2", className)}>
      <div className="grid grid-cols-2 gap-2">
        <OfflineTip offline={offline}>
          <Button
            variant="outline"
            size="lg"
            className="w-full"
            onClick={offer}
            loading={offering}
            disabled={iOffered || offline}
          >
            <Handshake /> {iOffered ? "Draw offered" : "Offer draw"}
          </Button>
        </OfflineTip>
        <AlertDialog>
          <OfflineTip offline={offline}>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                size="lg"
                className="w-full text-danger hover:bg-danger-soft hover:text-danger"
                disabled={offline}
              >
                <Flag /> Resign
              </Button>
            </AlertDialogTrigger>
          </OfflineTip>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Resign this game?</AlertDialogTitle>
              <AlertDialogDescription>
                {opponent} will get the win. Sure you want to stop here?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              {/* Radix focuses Cancel first, so Enter keeps playing. */}
              <AlertDialogCancel variant="default">Keep playing</AlertDialogCancel>
              <AlertDialogAction variant="destructive" onClick={onResign}>
                <Flag /> Resign
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
      {iOffered && (
        <p className="text-center text-[13px] text-muted-foreground" aria-live="polite">
          Waiting for {opponent} to answer…
        </p>
      )}
    </div>
  );
}
