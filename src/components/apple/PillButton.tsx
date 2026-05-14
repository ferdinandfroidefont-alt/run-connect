import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "dark";

export interface PillButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  large?: boolean;
  full?: boolean;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
  loading?: boolean;
}

export const PillButton = forwardRef<HTMLButtonElement, PillButtonProps>(function PillButton(
  { variant = "primary", large = false, full = false, leadingIcon, trailingIcon, loading = false, className, children, disabled, type = "button", ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      className={cn(
        "apple-pill",
        large && "apple-pill-large",
        variant === "secondary" && "apple-pill-secondary",
        variant === "dark" && "apple-pill-dark",
        full && "w-full",
        className
      )}
      {...rest}
    >
      {leadingIcon ? <span className="mr-1.5 inline-flex shrink-0 items-center">{leadingIcon}</span> : null}
      <span className="truncate">{loading ? "…" : children}</span>
      {trailingIcon ? <span className="ml-1.5 inline-flex shrink-0 items-center">{trailingIcon}</span> : null}
    </button>
  );
});
