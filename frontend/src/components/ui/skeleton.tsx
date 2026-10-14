import { cn } from "@/lib/utils"

/** Loading placeholder; size it to match the real content's shape. */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden
      className={cn("animate-pulse rounded-lg bg-surface-inset-strong", className)}
      {...props}
    />
  )
}

export { Skeleton }
