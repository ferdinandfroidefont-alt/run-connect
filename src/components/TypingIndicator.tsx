import { useEffect, useState } from "react";

interface TypingIndicatorProps {
  isTyping: boolean;
  username?: string;
}

export const TypingIndicator = ({ isTyping, username }: TypingIndicatorProps) => {
  const [dots, setDots] = useState("•");

  useEffect(() => {
    if (!isTyping) return;

    const interval = setInterval(() => {
      setDots(prev => {
        if (prev === "•") return "• •";
        if (prev === "• •") return "• • •";
        return "•";
      });
    }, 500);

    return () => clearInterval(interval);
  }, [isTyping]);

  if (!isTyping) return null;

  return (
    <div className="flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground">
      <div className="flex items-center gap-1">
        <span className="font-medium">{username || "Quelqu'un"}</span>
        <span>est en train d'écrire</span>
        <span className="inline-flex w-8 font-mono text-primary">{dots}</span>
      </div>
    </div>
  );
};