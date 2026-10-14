import * as React from "react"
import { cn } from "@/lib/utils"

/**
 * White sheet on paper. `variant`: "default" | "night" (navy panel + checker, for matchmaking,
 * game over, winner) | "inset" (flat warm well). `interactive` adds the hover lift for cards whose
 * title link is stretched with `after:absolute after:inset-0`. `size="sm"` tightens padding.
 */
function Card({
  className,
  size = "default",
  variant = "default",
  interactive = false,
  ...props
}: React.ComponentProps<"div"> & {
  size?: "default" | "sm"
  variant?: "default" | "night" | "inset"
  interactive?: boolean
}) {
  return (
    <div
      data-slot="card"
      data-size={size}
      data-variant={variant}
      className={cn(
        "group/card relative flex flex-col gap-(--card-spacing) overflow-hidden rounded-xl border border-border bg-card py-(--card-spacing) text-[14px] text-card-foreground shadow-card [--card-spacing:--spacing(5)] data-[size=default]:sm:[--card-spacing:--spacing(6)] has-data-[slot=card-footer]:pb-0 has-[>img:first-child]:pt-0 data-[size=sm]:[--card-spacing:--spacing(4)] data-[size=sm]:has-data-[slot=card-footer]:pb-0 *:[img:first-child]:rounded-t-xl *:[img:last-child]:rounded-b-xl",
        variant === "night" &&
          "checker border-transparent bg-surface-night text-primary-foreground shadow-raised [--checker-color:oklch(1_0_0/0.045)] [--checker-size:32px]",
        variant === "inset" && "border-transparent bg-surface-inset shadow-none",
        interactive &&
          "transition-[box-shadow,transform] duration-200 ease-out-soft hover:-translate-y-0.5 hover:shadow-raised has-[a:focus-visible]:ring-3 has-[a:focus-visible]:ring-ring has-[a:focus-visible]:ring-offset-2 has-[a:focus-visible]:ring-offset-background",
        className
      )}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "group/card-header @container/card-header grid auto-rows-min items-start gap-1 rounded-t-xl px-(--card-spacing) has-data-[slot=card-action]:grid-cols-[1fr_auto] has-data-[slot=card-description]:grid-rows-[auto_auto] [.border-b]:pb-(--card-spacing)",
        className
      )}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn(
        "font-heading text-h3 text-balance group-data-[size=sm]/card:text-[15px]",
        className
      )}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn(
        "text-[14px] text-muted-foreground group-data-[variant=night]/card:text-primary-foreground/75",
        className
      )}
      {...props}
    />
  )
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className
      )}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("px-(--card-spacing)", className)}
      {...props}
    />
  )
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn(
        "flex items-center gap-2 rounded-b-xl border-t border-border bg-surface-raised p-(--card-spacing) group-data-[variant=inset]/card:border-border-strong/50 group-data-[variant=inset]/card:bg-transparent group-data-[variant=night]/card:border-white/10 group-data-[variant=night]/card:bg-white/5",
        className
      )}
      {...props}
    />
  )
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
}
