import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-all backdrop-blur-xl",
  {
    variants: {
      variant: {
        default:
          "bg-primary/10 text-primary hover:bg-primary/20 shadow-[0_0_10px_rgba(61,139,242,0.2)]",
        secondary:
          "bg-secondary/10 text-secondary-foreground hover:bg-secondary/20",
        destructive:
          "bg-destructive/10 text-destructive hover:bg-destructive/20",
        outline: "bg-background/50 text-foreground border border-border/30",
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
