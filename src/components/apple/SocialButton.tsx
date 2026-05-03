import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type Provider = "apple" | "google" | "email";

export interface SocialButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  provider: Provider;
  icon?: ReactNode;
}

const VARIANT_CLASS: Record<Provider, string> = {
  apple: "apple-social-btn-apple",
  google: "apple-social-btn-google",
  email: "apple-social-btn-email",
};

export const SocialButton = forwardRef<HTMLButtonElement, SocialButtonProps>(function SocialButton(
  { provider, icon, className, children, type = "button", ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn("apple-social-btn", VARIANT_CLASS[provider], className)}
      {...rest}
    >
      {icon ? <span className="inline-flex shrink-0 items-center">{icon}</span> : null}
      <span className="truncate">{children}</span>
    </button>
  );
});
