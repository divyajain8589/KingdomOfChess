import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Children, Fragment } from "react";
import { cn } from "@/lib/utils";

/**
 * Mono scoresheet metadata separated by middots: `5+0 · 13/10/2026, 20:59 · 4 players`.
 * Pass each fact as a child; null/false children are skipped. No icons.
 */
export function MetaLine({ children, className }: { children: React.ReactNode; className?: string }) {
  const items = Children.toArray(children).filter((c) => c !== ""); // toArray already drops null/false
  return (
    <p className={cn("flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[13px] text-muted-foreground tabular-nums", className)}>
      {items.map((item, i) => (
        <Fragment key={i}>
          {i > 0 && (
            <span aria-hidden className="text-border-strong">
              ·
            </span>
          )}
          <span>{item}</span>
        </Fragment>
      ))}
    </p>
  );
}

/** Headline accent word: <h1>Your <Accent>move</Accent>.</h1> (one per screen, 24px+ headings only). */
export function Accent({ children, onNight = false }: { children: React.ReactNode; onNight?: boolean }) {
  return <em className={cn("font-extrabold italic", onNight ? "text-brand-orange" : "text-brand-orange-display")}>{children}</em>;
}

/**
 * Page title block. `eyebrow` is plain text (the "— " is added for you); `title` may contain <Accent>.
 * Optional: `description`, `meta` (usually a <MetaLine>), `actions` (buttons, right-aligned on desktop,
 * stacked below on mobile), `back` ({ href, label } pill link above), `badge` (e.g. <StatusPill>, inline after
 * the title on desktop, below it on mobile), `band` (checker texture band behind the header for detail pages).
 */
export function PageHeader({
  eyebrow,
  title,
  description,
  meta,
  actions,
  back,
  badge,
  band = false,
  className,
}: {
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  meta?: React.ReactNode;
  actions?: React.ReactNode;
  back?: { href: string; label: string };
  badge?: React.ReactNode;
  band?: boolean;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between",
        band && "isolate -mx-4 -mt-6 px-4 pt-6 pb-8 sm:-mx-6 sm:-mt-10 sm:px-6 sm:pt-10",
        className,
      )}
    >
      {band && (
        <div
          aria-hidden
          className="checker fade-bottom pointer-events-none absolute inset-0 -z-10 [--checker-color:oklch(0.248_0.049_253.4/0.035)]"
        />
      )}
      <div className="max-w-2xl min-w-0">
        {back && (
          <Link
            href={back.href}
            className="focus-ring -ml-2 mb-4 inline-flex h-9 items-center gap-1.5 rounded-full pr-3 pl-2 text-[13px] font-semibold text-muted-foreground transition-colors hover:bg-surface-inset hover:text-foreground"
          >
            <ArrowLeft className="size-4" aria-hidden />
            {back.label}
          </Link>
        )}
        {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
        <div className={cn(badge && "flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:gap-3")}>
          <h1 className="text-[26px] leading-tight font-extrabold tracking-tight sm:text-h1">{title}</h1>
          {badge && <div className="shrink-0">{badge}</div>}
        </div>
        {description && <p className="mt-2 text-body text-muted-foreground">{description}</p>}
        {meta && <div className="mt-4">{meta}</div>}
      </div>
      {actions && (
        <div className="flex flex-col gap-2 *:w-full sm:flex-row sm:flex-wrap sm:justify-end sm:*:w-auto">{actions}</div>
      )}
    </header>
  );
}
