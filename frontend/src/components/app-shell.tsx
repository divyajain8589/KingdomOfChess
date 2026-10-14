"use client";

import { useQueryClient } from "@tanstack/react-query";
import { CalendarDays, ChevronDown, Loader2, LogOut, Swords } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Logo, LogoMark } from "@/components/logo";
import { PlayerAvatar } from "@/components/player-avatar";
import { homeFor } from "@/components/role-gate";
import { useConnectionState } from "@/components/socket-provider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { api, errorMessage } from "@/lib/api";
import { useMe } from "@/lib/queries";
import { disconnectSocket } from "@/lib/socket";
import type { User } from "@/lib/types";
import { cn } from "@/lib/utils";

const NAV = {
  coach: [{ href: "/coach", label: "Tournaments" }],
  student: [
    { href: "/student", label: "Tournaments" },
    { href: "/student/schedule", label: "My schedule" },
  ],
};

const TABS = [
  { href: "/student", label: "Play", icon: Swords },
  { href: "/student/schedule", label: "Schedule", icon: CalendarDays },
];

function useIsActive() {
  const pathname = usePathname();
  return (href: string) =>
    href === "/coach" || href === "/student"
      ? pathname === href || pathname.startsWith(`${href}/tournaments`)
      : pathname.startsWith(href);
}

/** Live-updates indicator: a quiet green dot when connected, an amber "Reconnecting…" chip otherwise. */
export function ConnectionDot({ className }: { className?: string }) {
  const conn = useConnectionState();
  if (conn === "connected") {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span role="status" aria-label="Live updates on" className={cn("grid size-6 place-items-center", className)}>
            <span className="size-2 rounded-full bg-success shadow-[0_0_0_3px_var(--success-soft)]" />
          </span>
        </TooltipTrigger>
        <TooltipContent>Live updates on</TooltipContent>
      </Tooltip>
    );
  }
  return (
    <span
      role="status"
      // Fades in after a beat so the first connect on page load doesn't flash a warning.
      className={cn(
        "inline-flex h-7 animate-[conn-chip-in_0.25s_ease-out_1.2s_forwards] items-center gap-1.5 rounded-full bg-warning-soft px-2.5 text-[12px] font-semibold text-warning opacity-0",
        className,
      )}
    >
      <Loader2 className="size-3 animate-spin" aria-hidden />
      Reconnecting…
    </span>
  );
}

function UserMenu({ me }: { me: User }) {
  const qc = useQueryClient();
  const [signingOut, setSigningOut] = useState(false);
  const firstName = me.name.split(/\s+/)[0];

  async function logout() {
    setSigningOut(true);
    try {
      await api("/auth/logout", { method: "POST" });
      disconnectSocket();
      qc.clear();
      // Full reload on purpose: drops every cached query and the socket.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.href = "/login";
    } catch (err) {
      toast.error(errorMessage(err));
      setSigningOut(false);
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`Account menu for ${me.name}`}
        className="focus-ring inline-flex size-10 items-center justify-center rounded-full transition-colors hover:bg-surface-inset aria-expanded:bg-surface-inset md:h-10 md:w-auto md:gap-2 md:pr-3 md:pl-1"
      >
        <PlayerAvatar name={me.name} userId={me.id} size="sm" />
        <span className="hidden max-w-32 truncate text-[14px] font-bold md:inline">{firstName}</span>
        <ChevronDown className="hidden size-4 text-muted-foreground md:block" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="w-60">
        <DropdownMenuLabel className="flex items-center gap-3 px-2 py-2">
          <PlayerAvatar name={me.name} userId={me.id} size="md" />
          <span className="min-w-0">
            <span className="block truncate text-[14px] font-bold text-foreground">{me.name}</span>
            <span className="block text-eyebrow text-muted-foreground uppercase">
              {me.role === "coach" ? "Coach" : "Student"}
            </span>
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {me.role === "student" && (
          <DropdownMenuItem asChild>
            <Link href="/student/schedule">
              <CalendarDays /> My schedule
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem
          variant="destructive"
          disabled={signingOut}
          onSelect={(e) => {
            e.preventDefault();
            void logout();
          }}
        >
          {signingOut ? <Loader2 className="animate-spin" /> : <LogOut />}
          {signingOut ? "Signing out…" : "Sign out"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function StudentTabBar() {
  const isActive = useIsActive();
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-30 grid h-[calc(4rem+env(safe-area-inset-bottom))] grid-cols-2 border-t border-border bg-card pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      {TABS.map(({ href, label, icon: Icon }) => {
        const active = isActive(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "focus-ring flex flex-col items-center justify-center gap-1 text-[11px] font-bold transition-colors focus-visible:ring-inset focus-visible:ring-offset-0",
              active ? "text-primary" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <span
              className={cn(
                "grid h-7 w-12 place-items-center rounded-full transition-colors",
                active && "bg-primary-soft",
              )}
            >
              <Icon className="size-5" aria-hidden />
            </span>
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

/** Signed-in chrome: sticky header (logo, nav, connection, account menu) and, for students on mobile, a bottom tab bar. */
export function AppShell({ children }: { children: React.ReactNode }) {
  const { data: me } = useMe();
  const pathname = usePathname();
  const isActive = useIsActive();

  const links = me ? NAV[me.role] : [];
  const onMatch = pathname.startsWith("/matches/");
  const showTabBar = me?.role === "student" && !onMatch;

  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#main"
        className="sr-only z-50 rounded-lg bg-primary px-4 py-2 font-bold text-primary-foreground focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to content
      </a>
      <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-8 px-4 sm:px-6 md:h-16">
          <Link
            href={me ? homeFor(me.role) : "/"}
            aria-label="Kingdom of Chess, home"
            className="focus-ring -mx-1 flex items-center gap-2.5 rounded-lg px-1 py-1"
          >
            <LogoMark className="md:hidden" />
            <Logo className="text-[13px] sm:text-[13px] md:text-base" />
          </Link>
          <nav aria-label="Main" className="hidden h-full items-center gap-6 md:flex">
            {links.map((l) => {
              const active = isActive(l.href);
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "focus-ring relative inline-flex h-16 items-center text-[14px] font-semibold transition-colors focus-visible:ring-offset-0",
                    "after:absolute after:inset-x-0 after:bottom-0 after:h-[3px] after:rounded-t-full after:bg-brand-orange after:transition-opacity",
                    active ? "text-foreground after:opacity-100" : "text-muted-foreground after:opacity-0 hover:text-foreground",
                  )}
                >
                  {l.label}
                </Link>
              );
            })}
          </nav>
          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            {me && <ConnectionDot />}
            {me && <UserMenu me={me} />}
          </div>
        </div>
      </header>
      <main
        id="main"
        className={cn(
          "mx-auto w-full max-w-6xl flex-1 px-4 pt-6 pb-10 sm:px-6 sm:pt-10",
          onMatch && "max-w-[1200px] pt-4 sm:pt-6",
          showTabBar && "pb-24 md:pb-10",
        )}
      >
        {children}
      </main>
      {showTabBar && <StudentTabBar />}
    </div>
  );
}
