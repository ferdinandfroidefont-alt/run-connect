import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-gradient-to-r from-primary to-primary-glow text-primary-foreground shadow-lg shadow-primary/30",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-gradient-to-r from-red-500 to-pink-500 text-white shadow-lg shadow-red-500/30",
        outline: "text-foreground border-border/50",
        success:
          "border-transparent bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg shadow-green-500/30",
        warning:
          "border-transparent bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-500/30",
        purple:
          "border-transparent bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/30",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
