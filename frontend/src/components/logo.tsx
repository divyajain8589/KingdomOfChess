import { Crown } from "lucide-react";
import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 font-heading leading-none font-bold tracking-tight", className)}>
      <Crown className="size-5 text-brand-orange" aria-hidden />
      <span>
        <span className="text-brand-orange">Kingdom</span> <span className="text-primary">of Chess</span>
      </span>
    </span>
  );
}
