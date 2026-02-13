import React from "react";
import { Button, ButtonProps } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface InteractiveButtonProps extends ButtonProps {
  loading?: boolean;
  success?: boolean;
  children: React.ReactNode;
  loadingText?: string;
  successText?: string;
}

export const InteractiveButton = React.forwardRef<
  HTMLButtonElement,
  InteractiveButtonProps
>(({ 
  loading = false, 
  success = false, 
  children, 
  loadingText, 
  successText, 
  className, 
  disabled,
  ...props 
}, ref) => {
  const isDisabled = disabled || loading;
  
  return (
    <Button
      ref={ref}
      className={cn(
        "btn-interactive relative overflow-hidden",
        success && "success-state",
        loading && "loading-state",
        className
      )}
      disabled={isDisabled}
      {...props}
    >
      {loading && (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      )}
      
      {success && (
        <div className="mr-2 h-4 w-4 rounded-full bg-green-500 flex items-center justify-center animate-scale-in">
          <svg
            className="h-3 w-3 text-white animate-draw-check"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            viewBox="0 0 24 24"
            stroke="currentColor"
            style={{
              strokeDasharray: '16px',
              strokeDashoffset: success ? '0px' : '16px',
            }}
          >
            <polyline points="20,6 9,17 4,12" />
          </svg>
        </div>
      )}
      
      <span className={cn(
        "transition-all duration-200",
        (loading || success) && "opacity-90"
      )}>
        {loading && loadingText ? loadingText : 
         success && successText ? successText : 
         children}
      </span>
      
      {/* Ripple effect */}
      <span className="absolute inset-0 rounded-md bg-foreground/10 scale-0 group-active:scale-100 transition-transform duration-200 opacity-0 group-active:opacity-100" />
    </Button>
  );
});

InteractiveButton.displayName = "InteractiveButton";