import * as React from "react"
import { cn } from "@/lib/utils"

/** Text input. `size`: "default" (h-10) | "lg" (h-12, rounded-xl; login and big forms). */
function Input({
  className,
  type,
  size = "default",
  ...props
}: Omit<React.ComponentProps<"input">, "size"> & { size?: "default" | "lg" }) {
  return (
    <input
      type={type}
      data-slot="input"
      data-size={size}
      className={cn(
        "h-10 w-full min-w-0 rounded-lg border border-input bg-card px-3 py-1 text-[15px] font-medium text-foreground transition-[color,border-color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-[14px] file:font-semibold file:text-foreground placeholder:font-normal placeholder:text-muted-foreground hover:border-[color-mix(in_oklch,var(--input),var(--foreground)_12%)] focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:bg-surface-inset disabled:opacity-60 aria-invalid:border-danger aria-invalid:ring-3 aria-invalid:ring-danger/20 data-[size=lg]:h-12 data-[size=lg]:rounded-xl data-[size=lg]:px-4",
        className
      )}
      {...props}
    />
  )
}

export { Input }
