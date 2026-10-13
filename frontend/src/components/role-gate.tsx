"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { ErrorState, LoadingState } from "@/components/states";
import { useMe } from "@/lib/queries";
import type { Role } from "@/lib/types";

export const homeFor = (role: Role) => (role === "coach" ? "/coach" : "/student");

/**
 * Client-side role enforcement. proxy.ts already redirects optimistically from the cookie; this
 * checks the verified /me response. The API enforces roles regardless.
 */
export function RoleGate({ role, children }: { role?: Role; children: React.ReactNode }) {
  const me = useMe();
  const router = useRouter();
  const wrongRole = !!(role && me.data && me.data.role !== role);

  useEffect(() => {
    if (wrongRole && me.data) router.replace(homeFor(me.data.role));
  }, [wrongRole, me.data, router]);

  if (me.isPending) return <LoadingState className="mx-auto mt-10 max-w-3xl" />;
  if (me.isError) return <ErrorState error={me.error} onRetry={() => me.refetch()} className="mx-auto mt-10 max-w-md" />;
  if (wrongRole) return <LoadingState className="mx-auto mt-10 max-w-3xl" />;
  return <>{children}</>;
}
