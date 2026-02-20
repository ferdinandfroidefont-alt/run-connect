import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-[17px] font-bold transition-colors duration-150 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg]:size-5 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground rounded-full active:brightness-90 shadow-sm shadow-primary/20",
        destructive: "bg-destructive text-destructive-foreground rounded-full active:brightness-90",
        outline: "border-2 border-border bg-background text-foreground rounded-full active:bg-secondary",
        secondary: "bg-secondary text-foreground rounded-full active:brightness-95",
        ghost: "text-primary rounded-full active:bg-secondary",
        link: "text-primary underline-offset-4 hover:underline",
        tinted: "bg-primary/10 text-primary font-bold rounded-full active:bg-primary/20",
        cyan: "bg-[hsl(193_100%_42%)] text-white font-bold rounded-full active:brightness-90",
      },
      size: {
        default: "h-[48px] px-6",
        sm: "h-[36px] px-4 text-[15px]",
        lg: "h-[54px] px-7",
        icon: "h-[44px] w-[44px]",
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