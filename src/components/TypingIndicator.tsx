import { useEffect, useState } from "react";

interface TypingIndicatorProps {
  isTyping: boolean;
  username?: string;
  /** caption = ligne centrée maquette RC · bubble = bulle à points (historique iMessage) */
  variant?: "bubble" | "caption";
}

export const TypingIndicator = ({
  isTyping,
  variant = "bubble",
}: TypingIndicatorProps) => {
  const [dots, setDots] = useState(1);

  useEffect(() => {
    if (!isTyping) return;

    const interval = setInterval(() => {
      setDots((prev) => (prev >= 3 ? 1 : prev + 1));
    }, 400);

    return () => clearInterval(interval);
  }, [isTyping]);

  if (!isTyping) return null;

  if (variant === "caption") {
    return (
      <div
        className="self-center text-[10px] font-semibold uppercase tracking-[0.5px] text-[#7A7771] dark:text-muted-foreground"
        role="status"
        aria-live="polite"
      >
        EN TRAIN D'ÉCRIRE…
      </div>
    );
  }

  return (
    <div className="flex items-start gap-2 px-1 py-1">
      <div className="inline-flex items-center gap-1 rounded-[18px] border border-[#E2DBD0] bg-white px-4 py-2.5 dark:border-[#1f1f1f] dark:bg-[#2c2c2e]">
        <div className="flex items-center gap-0.5">
          <span
            className={`h-2 w-2 rounded-full bg-[#7A7771] transition-opacity duration-200 dark:bg-muted-foreground ${
              dots >= 1 ? "opacity-100" : "opacity-40"
            }`}
            style={{ animationDelay: "0ms" }}
          />
          <span
            className={`h-2 w-2 rounded-full bg-[#7A7771] transition-opacity duration-200 dark:bg-muted-foreground ${
              dots >= 2 ? "opacity-100" : "opacity-40"
            }`}
            style={{ animationDelay: "150ms" }}
          />
          <span
            className={`h-2 w-2 rounded-full bg-[#7A7771] transition-opacity duration-200 dark:bg-muted-foreground ${
              dots >= 3 ? "opacity-100" : "opacity-40"
            }`}
            style={{ animationDelay: "300ms" }}
          />
        </div>
      </div>
    </div>
  );
};