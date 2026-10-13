"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { homeFor } from "@/components/role-gate";
import { LoadingState } from "@/components/states";
import { useMe } from "@/lib/queries";

/** proxy.ts normally redirects "/" before we get here; this is the client-side fallback. */
export default function Home() {
  const me = useMe();
  const router = useRouter();
  useEffect(() => {
    if (me.data) router.replace(homeFor(me.data.role));
    else if (me.isError) router.replace("/login");
  }, [me.data, me.isError, router]);
  return <LoadingState className="mx-auto mt-20 w-full max-w-md" />;
}
