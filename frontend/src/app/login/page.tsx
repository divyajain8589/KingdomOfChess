import { Suspense } from "react";
import { Logo } from "@/components/logo";
import { Piece } from "@/components/states";
import { LoginForm } from "./login-form";

/** Decorative 6x6 board: a few squares hold pieces (row-major index → piece code). */
const BOARD_SIZE = 6;
const BOARD_PIECES: Record<number, string> = { 8: "bQ", 15: "wN", 28: "wK" };

function MiniBoard() {
  return (
    <div aria-hidden className="flex items-end gap-8">
      <div className="w-[340px] shrink-0 -rotate-4 rounded-2xl bg-board-frame p-2 shadow-pop ring-1 ring-white/10">
        <div className="grid grid-cols-6 overflow-hidden rounded-[10px]">
          {Array.from({ length: BOARD_SIZE * BOARD_SIZE }, (_, i) => {
            const dark = (Math.floor(i / BOARD_SIZE) + (i % BOARD_SIZE)) % 2 === 1;
            const piece = BOARD_PIECES[i];
            return (
              <div
                key={i}
                className={`grid aspect-square place-items-center ${dark ? "bg-board-dark" : "bg-board-light"}`}
              >
                {piece && <Piece code={piece} className="size-[85%]" />}
              </div>
            );
          })}
        </div>
      </div>
      <p className="pb-4 font-mono text-[13px] text-primary-foreground/50">1. e4 e5 2. Nf3 …</p>
    </div>
  );
}

function Headline({ className }: { className?: string }) {
  return (
    <p className={className}>
      Tournaments, played <em className="font-extrabold text-brand-orange italic">live</em>.
    </p>
  );
}

export default function LoginPage() {
  return (
    <div className="grid min-h-screen bg-background lg:grid-cols-[1.1fr_1fr]">
      {/* Hero: mobile top band, desktop left panel */}
      <section
        aria-label="Kingdom of Chess"
        className="checker relative overflow-hidden rounded-b-[28px] bg-surface-night px-5 pt-8 pb-10 text-primary-foreground [--checker-color:oklch(1_0_0/0.045)] [--checker-size:32px] lg:flex lg:flex-col lg:justify-between lg:rounded-none lg:p-12 lg:[--checker-size:40px]"
      >
        <Logo variant="onNight" />

        <div className="lg:my-12">
          <p className="mb-3 hidden text-eyebrow text-brand-orange uppercase lg:block">— Kingdom of Chess Academy</p>
          <Headline className="mt-5 max-w-[14ch] animate-in text-[30px] leading-[1.1] font-extrabold tracking-tight duration-500 fade-in slide-in-from-bottom-2 lg:mt-0 lg:max-w-[12ch] lg:text-display" />
          <p className="mt-4 hidden max-w-md text-[17px] text-primary-foreground/75 lg:block">
            Real games against your classmates, with real clocks and a live leaderboard your coach can follow.
          </p>
        </div>

        <div className="hidden lg:block">
          <MiniBoard />
        </div>
      </section>

      {/* Form: a card on paper under the band on mobile, an open column on desktop */}
      <main className="flex justify-center px-5 pb-10 lg:items-center lg:p-12">
        <div className="relative -mt-4 w-full max-w-[400px] rounded-xl border border-border bg-card p-5 shadow-card lg:mt-0 lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none">
          <Suspense>
            <LoginForm />
          </Suspense>
        </div>
      </main>
    </div>
  );
}
