"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

/**
 * Data table in a rounded white sheet. `bare` drops the sheet (for tables already inside a Card).
 * On mobile, hide secondary columns with `hidden sm:table-cell` instead of scrolling sideways.
 */
function Table({
  className,
  bare = false,
  ...props
}: React.ComponentProps<"table"> & { bare?: boolean }) {
  return (
    <div
      data-slot="table-container"
      className={cn(
        "relative w-full overflow-x-auto",
        !bare && "overflow-hidden rounded-xl border border-border bg-card"
      )}
    >
      <table
        data-slot="table"
        className={cn("w-full caption-bottom text-[14px]", className)}
        {...props}
      />
    </div>
  )
}

function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return (
    <thead
      data-slot="table-header"
      className={cn(
        "bg-surface-inset [&_tr]:border-b [&_tr]:border-border [&_tr]:hover:bg-transparent",
        className
      )}
      {...props}
    />
  )
}

function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return (
    <tbody
      data-slot="table-body"
      className={cn("[&_tr:last-child]:border-0", className)}
      {...props}
    />
  )
}

function TableFooter({ className, ...props }: React.ComponentProps<"tfoot">) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn(
        "border-t border-border bg-surface-raised font-semibold [&>tr]:last:border-b-0",
        className
      )}
      {...props}
    />
  )
}

function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        "border-b border-border/70 transition-colors hover:bg-surface-raised has-aria-expanded:bg-surface-raised data-[state=selected]:bg-primary-soft/60 data-[state=selected]:shadow-[inset_3px_0_0_var(--primary)] data-[you=true]:bg-primary-soft/60 data-[you=true]:shadow-[inset_3px_0_0_var(--primary)]",
        className
      )}
      {...props}
    />
  )
}

function TableHead({ className, ...props }: React.ComponentProps<"th">) {
  return (
    <th
      data-slot="table-head"
      className={cn(
        "h-10 px-3 text-left align-middle text-eyebrow font-bold whitespace-nowrap text-muted-foreground uppercase first:pl-4 last:pr-4 [&:has([role=checkbox])]:pr-0",
        className
      )}
      {...props}
    />
  )
}

function TableCell({ className, ...props }: React.ComponentProps<"td">) {
  return (
    <td
      data-slot="table-cell"
      className={cn(
        "h-14 px-3 py-2 align-middle whitespace-nowrap first:pl-4 last:pr-4 [&:has([role=checkbox])]:pr-0",
        className
      )}
      {...props}
    />
  )
}

function TableCaption({
  className,
  ...props
}: React.ComponentProps<"caption">) {
  return (
    <caption
      data-slot="table-caption"
      className={cn("mt-3 text-[12px] text-muted-foreground", className)}
      {...props}
    />
  )
}

/** "You" marker for the viewer's own row: <TableRow data-you="true">…<YouChip/> */
function YouChip({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="you-chip"
      className={cn(
        "ml-1.5 inline-flex h-4 items-center rounded-full bg-primary px-1.5 text-[10px] font-extrabold tracking-wide text-primary-foreground uppercase",
        className
      )}
      {...props}
    >
      {props.children ?? "You"}
    </span>
  )
}

export {
  YouChip,
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
}
