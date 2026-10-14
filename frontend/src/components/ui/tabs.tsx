"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { Tabs as TabsPrimitive } from "radix-ui"

function Tabs({
  className,
  orientation = "horizontal",
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      data-orientation={orientation}
      className={cn(
        "group/tabs flex gap-4 data-horizontal:flex-col",
        className
      )}
      {...props}
    />
  )
}

const tabsListVariants = cva(
  "group/tabs-list inline-flex items-center text-muted-foreground group-data-vertical/tabs:h-fit group-data-vertical/tabs:flex-col",
  {
    variants: {
      variant: {
        /** Underline tabs (default): page-level filters and sections. */
        default:
          "h-11 w-full justify-start gap-6 overflow-x-auto overflow-y-hidden rounded-none border-b border-border bg-transparent p-0 [scrollbar-width:none]",
        /** Alias of default, kept for older call sites. */
        line: "h-11 w-full justify-start gap-6 overflow-x-auto overflow-y-hidden rounded-none border-b border-border bg-transparent p-0 [scrollbar-width:none]",
        /** Segmented control on a warm inset (small in-card toggles only). */
        segmented: "h-11 w-fit gap-1 rounded-xl bg-surface-inset p-1",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

/** Tab strip. `variant`: "default" (underline) | "segmented". */
function TabsList({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List> &
  VariantProps<typeof tabsListVariants>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      data-variant={variant === "line" ? "default" : variant}
      className={cn(tabsListVariants({ variant }), className)}
      {...props}
    />
  )
}

/** One tab. Put a count in `<TabCount>` after the label. */
function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center gap-1.5 text-[14px] font-bold whitespace-nowrap text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 data-[state=active]:text-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        // underline
        "group-data-[variant=default]/tabs-list:h-11 group-data-[variant=default]/tabs-list:rounded-none group-data-[variant=default]/tabs-list:px-0 group-data-[variant=default]/tabs-list:focus-visible:ring-offset-0 group-data-[variant=default]/tabs-list:focus-visible:ring-inset",
        "after:absolute after:inset-x-0 after:bottom-0 after:h-[3px] after:rounded-t-full after:bg-brand-orange after:opacity-0 after:transition-opacity group-data-[variant=default]/tabs-list:data-[state=active]:after:opacity-100",
        // segmented
        "group-data-[variant=segmented]/tabs-list:h-9 group-data-[variant=segmented]/tabs-list:flex-1 group-data-[variant=segmented]/tabs-list:rounded-lg group-data-[variant=segmented]/tabs-list:px-3 group-data-[variant=segmented]/tabs-list:data-[state=active]:bg-card group-data-[variant=segmented]/tabs-list:data-[state=active]:shadow-card",
        className
      )}
      {...props}
    />
  )
}

/** Count chip inside a TabsTrigger: <TabsTrigger value="live">Live<TabCount>3</TabCount></TabsTrigger> */
function TabCount({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="tab-count"
      className={cn(
        "ml-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-surface-inset px-1.5 font-mono text-[11px] font-bold text-muted-foreground tabular-nums in-data-[state=active]:text-foreground",
        className
      )}
      {...props}
    />
  )
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn("flex-1 text-[15px] outline-none", className)}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent, TabCount, tabsListVariants }
