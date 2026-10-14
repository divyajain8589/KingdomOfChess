import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Loader2 } from "lucide-react"
import { Slot } from "radix-ui"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button relative inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-clip-padding text-[14px] font-bold whitespace-nowrap transition-[color,background-color,border-color,box-shadow,transform,opacity] duration-150 ease-out-soft outline-none select-none focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:not-aria-[haspopup]:translate-y-px disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none aria-disabled:cursor-not-allowed aria-disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        /** Navy primary. One per screen. */
        default:
          "bg-primary text-primary-foreground shadow-cta hover:bg-primary-hover disabled:hover:bg-primary",
        /** Orange "play now" CTA: Find an opponent / Resume your game / Play again only. */
        play: "bg-brand-orange text-brand-orange-foreground shadow-cta-orange hover:bg-[color-mix(in_oklch,var(--brand-orange),black_6%)] disabled:hover:bg-brand-orange",
        outline:
          "border-border-strong bg-card text-foreground hover:bg-surface-inset aria-expanded:bg-surface-inset",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-surface-inset-strong aria-expanded:bg-surface-inset-strong",
        ghost:
          "text-muted-foreground hover:bg-surface-inset hover:text-foreground aria-expanded:bg-surface-inset aria-expanded:text-foreground",
        destructive:
          "bg-danger-soft text-danger hover:bg-danger hover:text-white disabled:hover:bg-danger-soft disabled:hover:text-danger",
        /** Secondary action on a navy `surface-night` panel. */
        onNight:
          "bg-white/10 text-primary-foreground ring-1 ring-white/20 hover:bg-white/15 focus-visible:ring-offset-surface-night",
        link: "h-auto px-0 text-primary underline-offset-4 hover:underline",
      },
      size: {
        default:
          "h-10 gap-2 px-4 has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3",
        xs: "h-7 gap-1 rounded-md px-2 text-[12px] has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-9 gap-1.5 px-3 text-[13px] has-data-[icon=inline-end]:pr-2.5 has-data-[icon=inline-start]:pl-2.5 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-12 gap-2 rounded-xl px-6 text-[15px] has-data-[icon=inline-end]:pr-5 has-data-[icon=inline-start]:pl-5",
        xl: "h-14 gap-2.5 rounded-xl px-7 text-[16px] has-data-[icon=inline-end]:pr-6 has-data-[icon=inline-start]:pl-6 [&_svg:not([class*='size-'])]:size-5",
        icon: "size-10",
        "icon-xs": "size-7 rounded-md [&_svg:not([class*='size-'])]:size-3.5",
        "icon-sm": "size-9",
        "icon-lg": "size-12 rounded-xl [&_svg:not([class*='size-'])]:size-5",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

/**
 * Button. Variants: default | play | outline | secondary | ghost | destructive | onNight | link.
 * Sizes: xs | sm | default | lg | xl | icon-xs | icon-sm | icon | icon-lg.
 * `loading` keeps the label, swaps the leading icon for a spinner, disables and sets aria-busy.
 */
function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  loading = false,
  disabled,
  children,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
    /** Show a spinner in place of the leading icon and disable the button. */
    loading?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  let content = children
  if (loading && !asChild) {
    // Replace a leading svg icon (if any) with the spinner; otherwise prepend it.
    const items = React.Children.toArray(children)
    const first = items[0]
    const firstIsIcon =
      React.isValidElement(first) && typeof first.type !== "string"
    content = (
      <>
        <Loader2 className="animate-spin" aria-hidden />
        {firstIsIcon ? items.slice(1) : items}
      </>
    )
  }

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {content}
    </Comp>
  )
}

export { Button, buttonVariants }
