"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Logo } from "@/components/logo";
import { homeFor } from "@/components/role-gate";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, errorMessage } from "@/lib/api";
import { qk } from "@/lib/queries";
import type { User } from "@/lib/types";

const DEMO = [
  { label: "Coach", email: "coach@koc.test" },
  { label: "Aarav", email: "aarav@koc.test" },
  { label: "Diya", email: "diya@koc.test" },
  { label: "Kabir", email: "kabir@koc.test" },
  { label: "Meera", email: "meera@koc.test" },
];

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const qc = useQueryClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const user = await api<User>("/auth/login", { method: "POST", body: { email, password } });
      qc.setQueryData(qk.me, user);
      const next = params.get("next");
      // Only follow same-site relative paths, and only into the right area for this role.
      const safeNext =
        next && next.startsWith("/") && !next.startsWith("//") && !next.startsWith(user.role === "coach" ? "/student" : "/coach")
          ? next
          : null;
      router.replace(safeNext ?? homeFor(user.role));
      router.refresh();
    } catch (err) {
      setError(errorMessage(err));
      setPending(false);
    }
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="space-y-2 text-center">
        <Logo className="mx-auto text-xl" />
        <CardTitle className="text-2xl">Sign in</CardTitle>
        <CardDescription>Tournaments, played live.</CardDescription>
      </CardHeader>
      <form onSubmit={submit} noValidate>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
        </CardContent>
        <CardFooter className="mt-6 flex flex-col gap-4">
          <Button type="submit" className="w-full" disabled={pending || !email || !password}>
            {pending && <Loader2 className="animate-spin" />} Sign in
          </Button>
          <div className="w-full space-y-2 text-center">
            <p className="text-xs text-muted-foreground">Demo accounts (password: password123)</p>
            <div className="flex flex-wrap justify-center gap-1.5">
              {DEMO.map((d) => (
                <Button
                  key={d.email}
                  type="button"
                  variant="outline"
                  size="xs"
                  onClick={() => {
                    setEmail(d.email);
                    setPassword("password123");
                  }}
                >
                  {d.label}
                </Button>
              ))}
            </div>
          </div>
        </CardFooter>
      </form>
    </Card>
  );
}
