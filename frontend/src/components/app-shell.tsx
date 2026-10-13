"use client";

import { useQueryClient } from "@tanstack/react-query";
import { LogOut, Wifi, WifiOff } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Logo } from "@/components/logo";
import { homeFor } from "@/components/role-gate";
import { useConnectionState } from "@/components/socket-provider";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { api, errorMessage } from "@/lib/api";
import { useMe } from "@/lib/queries";
import { disconnectSocket } from "@/lib/socket";
import { cn } from "@/lib/utils";

const NAV = {
  coach: [{ href: "/coach", label: "Tournaments" }],
  student: [
    { href: "/student", label: "Tournaments" },
    { href: "/student/schedule", label: "My schedule" },
  ],
};

export function AppShell({ children }: { children: React.ReactNode }) {
  const { data: me } = useMe();
  const pathname = usePathname();
  const qc = useQueryClient();
  const conn = useConnectionState();
  const [signingOut, setSigningOut] = useState(false);

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

  const links = me ? NAV[me.role] : [];
  const isActive = (href: string) =>
    href === "/coach" || href === "/student" ? pathname === href || pathname.startsWith(`${href}/tournaments`) : pathname.startsWith(href);

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-30 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4">
          <Link href={me ? homeFor(me.role) : "/"} aria-label="Home">
            <Logo />
          </Link>
          <nav className="flex items-center gap-1">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground",
                  isActive(l.href) && "bg-muted font-medium text-foreground",
                )}
              >
                {l.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-muted-foreground" aria-label={`Live connection: ${conn}`}>
                  {conn === "connected" ? (
                    <Wifi className="size-4 text-emerald-600" />
                  ) : (
                    <WifiOff className={cn("size-4", conn === "disconnected" && "text-destructive")} />
                  )}
                </span>
              </TooltipTrigger>
              <TooltipContent>{conn === "connected" ? "Live updates connected" : "Live updates reconnecting…"}</TooltipContent>
            </Tooltip>
            {me && (
              <div className="hidden text-right text-sm leading-tight sm:block">
                <div className="font-medium">{me.name}</div>
                <div className="text-xs text-muted-foreground capitalize">{me.role}</div>
              </div>
            )}
            <Button variant="ghost" size="sm" onClick={logout} disabled={signingOut}>
              <LogOut /> <span className="hidden sm:inline">Sign out</span>
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">{children}</main>
    </div>
  );
}
