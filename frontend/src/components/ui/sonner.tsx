"use client"

import { useSyncExternalStore } from "react"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react"

const DESKTOP = "(min-width: 768px)"
function subscribe(cb: () => void) {
  const mql = window.matchMedia(DESKTOP)
  mql.addEventListener("change", cb)
  return () => mql.removeEventListener("change", cb)
}
const isDesktop = () => window.matchMedia(DESKTOP).matches

/** App toaster: top-center on mobile, bottom-right from md. Light-only, navy-on-white cards. */
const Toaster = ({ ...props }: ToasterProps) => {
  const desktop = useSyncExternalStore(subscribe, isDesktop, () => false)

  return (
    <Sonner
      theme="light"
      position={desktop ? "bottom-right" : "top-center"}
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-4 text-success" />,
        info: <InfoIcon className="size-4 text-info" />,
        warning: <TriangleAlertIcon className="size-4 text-warning" />,
        error: <OctagonXIcon className="size-4 text-danger" />,
        loading: <Loader2Icon className="size-4 animate-spin text-muted-foreground" />,
      }}
      style={
        {
          "--normal-bg": "var(--card)",
          "--normal-text": "var(--foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius-xl)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast:
            "cn-toast rounded-xl! border! border-border! bg-card! font-sans! text-[14px]! font-semibold! text-foreground! shadow-pop!",
          description: "text-[13px]! font-medium! text-muted-foreground!",
          error: "border-danger/30!",
          success: "border-success/25!",
          warning: "border-warning/30!",
          actionButton: "rounded-lg! bg-primary! font-bold! text-primary-foreground!",
          cancelButton: "rounded-lg! bg-surface-inset! font-bold! text-foreground!",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
