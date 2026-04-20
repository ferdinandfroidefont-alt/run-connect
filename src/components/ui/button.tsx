import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-[17px] font-semibold tracking-tight transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg]:size-5 [&_svg]:shrink-0 active:scale-[0.98] ios-interactive",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground rounded-ios-lg shadow-md shadow-primary/18 ring-1 ring-black/[0.04] dark:ring-white/[0.08] active:opacity-90",
        destructive:
          "bg-destructive text-destructive-foreground rounded-ios-lg shadow-sm active:opacity-90",
        outline:
          "border border-border/80 bg-background/95 text-foreground rounded-ios-lg active:bg-secondary/90 dark:border-border dark:bg-secondary dark:active:bg-[#1a1a1a]",
        secondary: "bg-secondary text-secondary-foreground rounded-ios-lg active:opacity-90",
        ghost: "text-primary rounded-ios-lg active:bg-secondary/80 dark:active:bg-[#111111]",
        link: "text-primary underline-offset-4 hover:underline active:scale-100 rounded-md",
        tinted: "bg-primary/[0.12] text-primary font-semibold rounded-full active:bg-primary/20",
      },
      size: {
        default: "h-[50px] px-ios-4 min-w-[44px]",
        sm: "h-[36px] px-ios-3 text-[15px] rounded-ios-md active:scale-[0.99]",
        lg: "h-[56px] px-ios-6 text-[17px]",
        icon: "h-[44px] w-[44px] rounded-ios-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"

    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }