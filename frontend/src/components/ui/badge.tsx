import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { Slot } from "radix-ui"

const badgeVariants = cva(
  "group/badge inline-flex h-6 w-fit shrink-0 items-center justify-center gap-1.5 overflow-hidden rounded-full border border-transparent px-2.5 text-[12px] font-bold whitespace-nowrap transition-colors focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 aria-invalid:border-destructive [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground [a]:hover:bg-primary-hover",
        secondary: "bg-surface-inset text-foreground [a]:hover:bg-surface-inset-strong",
        destructive: "bg-danger-soft text-danger",
        outline: "border-border-strong bg-card text-foreground [a]:hover:bg-surface-inset",
        ghost: "text-muted-foreground hover:bg-surface-inset",
        link: "text-primary underline-offset-4 hover:underline",
        /** Soft semantic tones (always pair with words). */
        success: "bg-success-soft text-success",
        warning: "bg-warning-soft text-warning",
        info: "bg-info-soft text-info",
        orange: "bg-brand-orange-soft text-brand-orange-ink",
        /** Mono metadata chip, e.g. a time control "5+0". */
        mono: "bg-surface-inset font-mono text-foreground tabular-nums",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

/**
 * Small pill label. Variants: default | secondary | outline | ghost | destructive | link |
 * success | warning | info | orange | mono. For tournament status use <StatusPill>, for live games <LivePill>.
 */
function Badge({
  className,
  variant = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span"

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
