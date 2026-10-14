"use client";

import { useQueryClient } from "@tanstack/react-query";
import { CircleAlert, Eye, EyeOff } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { PlayerAvatar } from "@/components/player-avatar";
import { homeFor } from "@/components/role-gate";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError, api, errorMessage } from "@/lib/api";
import { qk } from "@/lib/queries";
import type { User } from "@/lib/types";
import { cn } from "@/lib/utils";

const DEMO_PASSWORD = "password123";

// Matches the backend seed (backend/src/db/seed.ts).
const DEMO = [
  { name: "Coach Anand", email: "coach@koc.test", role: "Coach" },
  { name: "Aarav Sharma", email: "aarav@koc.test", role: "Student" },
  { name: "Diya Patel", email: "diya@koc.test", role: "Student" },
  { name: "Kabir Singh", email: "kabir@koc.test", role: "Student" },
  { name: "Meera Iyer", email: "meera@koc.test", role: "Student" },
] as const;

// Inlined at build time. Set to "false" to hide the demo quick-fill buttons.
const SHOW_DEMO = process.env.NEXT_PUBLIC_SHOW_DEMO_ACCOUNTS !== "false";

type Phase = "idle" | "pending" | "redirecting";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const qc = useQueryClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const busy = phase !== "idle";

  async function signIn(creds: { email: string; password: string }) {
    if (busy) return;
    setError(null);
    setPhase("pending");
    try {
      const user = await api<User>("/auth/login", { method: "POST", body: creds });
      qc.setQueryData(qk.me, user);
      setPhase("redirecting");
      const next = params.get("next");
      // Only follow same-site relative paths, and only into the right area for this role.
      const safeNext =
        next && next.startsWith("/") && !next.startsWith("//") && !next.startsWith(user.role === "coach" ? "/student" : "/coach")
          ? next
          : null;
      router.replace(safeNext ?? homeFor(user.role));
      router.refresh();
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 401
          ? "That email and password don't match. Try again or ask your coach."
          : errorMessage(err),
      );
      setPhase("idle");
    }
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    void signIn({ email, password });
  }

  function signInAsDemo(demoEmail: string) {
    setEmail(demoEmail);
    setPassword(DEMO_PASSWORD);
    void signIn({ email: demoEmail, password: DEMO_PASSWORD });
  }

  return (
    <div className="w-full">
      <p className="eyebrow mb-2">— Welcome back</p>
      <h1 className="text-[26px] leading-tight font-extrabold tracking-tight sm:text-h1">Sign in to play</h1>
      <p className="mt-2 text-muted-foreground">Use the email and password from your coach.</p>

      <form onSubmit={submit} noValidate className="mt-6 space-y-4">
        {error && (
          <Alert className="border-danger/25 bg-danger-soft px-3 py-2.5 text-danger">
            <CircleAlert aria-hidden />
            <AlertDescription className="text-[14px] font-semibold text-danger">{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <Label htmlFor="email" className="text-[13px] font-bold">
            Email
          </Label>
          <Input
            id="email"
            type="email"
            size="lg"
            autoComplete="email"
            inputMode="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={busy}
            aria-invalid={error ? true : undefined}
            required
            autoFocus
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password" className="text-[13px] font-bold">
            Password
          </Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              size="lg"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={busy}
              aria-invalid={error ? true : undefined}
              className="pr-12"
              required
            />
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="absolute top-1/2 right-1.5 -translate-y-1/2 active:not-aria-[haspopup]:-translate-y-1/2"
              onClick={() => setShowPassword((s) => !s)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
              disabled={busy}
            >
              {showPassword ? <EyeOff /> : <Eye />}
            </Button>
          </div>
        </div>

        <Button type="submit" size="xl" className="mt-2 w-full" loading={busy} disabled={!email || !password}>
          {phase === "redirecting" ? "Taking you in…" : phase === "pending" ? "Signing in…" : "Sign in"}
        </Button>
      </form>

      {SHOW_DEMO && (
        <section aria-labelledby="demo-heading" className="mt-8">
          <div className="flex items-center gap-3">
            <span className="h-px flex-1 bg-border" />
            <h2 id="demo-heading" className="text-eyebrow text-muted-foreground uppercase">
              Try a demo account
            </h2>
            <span className="h-px flex-1 bg-border" />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {DEMO.map((d) => (
              <Button
                key={d.email}
                type="button"
                variant="outline"
                size="lg"
                className={cn("h-12 justify-start gap-3 px-3", d.role === "Coach" && "col-span-2")}
                onClick={() => signInAsDemo(d.email)}
                disabled={busy}
                aria-label={`Sign in as ${d.name} (${d.role})`}
              >
                <PlayerAvatar name={d.name} userId={d.email} size="sm" />
                <span className="flex min-w-0 flex-col items-start leading-tight">
                  <span className="truncate text-[14px] font-bold">
                    {d.role === "Coach" ? d.name : d.name.split(" ")[0]}
                  </span>
                  <span className="text-[12px] font-medium text-muted-foreground">{d.role}</span>
                </span>
              </Button>
            ))}
          </div>
          <p className="mt-3 text-center font-mono text-[12px] text-muted-foreground">
            Password for all demo accounts: {DEMO_PASSWORD}
          </p>
        </section>
      )}
    </div>
  );
}
