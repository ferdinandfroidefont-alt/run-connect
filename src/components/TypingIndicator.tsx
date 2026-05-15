interface TypingIndicatorProps {
  isTyping: boolean;
  username?: string;
  /** caption = ligne centrée · bubble = bulle à points (maquette Messages) */
  variant?: "bubble" | "caption";
}

export const TypingIndicator = ({
  isTyping,
  variant = "bubble",
}: TypingIndicatorProps) => {
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
    <div className="flex justify-start px-1 py-1">
      <div
        className="inline-flex items-center gap-[5px] bg-white px-[18px] py-3"
        style={{
          borderRadius: 22,
          boxShadow:
            "0 1px 3px rgba(0,0,0,0.04), 0 0 0 0.5px rgba(0,0,0,0.06)",
        }}
      >
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: "#8E8E93",
              animation: `typingDot 1.2s ease-in-out ${i * 0.18}s infinite`,
            }}
          />
        ))}
      </div>
    </div>
  );
};