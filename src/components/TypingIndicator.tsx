import { useEffect, useState } from "react";

interface TypingIndicatorProps {
  isTyping: boolean;
  username?: string;
}

export const TypingIndicator = ({ isTyping, username }: TypingIndicatorProps) => {
  const [dots, setDots] = useState(1);

  useEffect(() => {
    if (!isTyping) return;

    const interval = setInterval(() => {
      setDots(prev => prev >= 3 ? 1 : prev + 1);
    }, 400);

    return () => clearInterval(interval);
  }, [isTyping]);

  if (!isTyping) return null;

  return (
    <div className="flex items-start gap-2 px-1 py-1">
      {/* iMessage typing bubble */}
      <div className="bg-[#E5E5EA] rounded-[18px] px-4 py-2.5 inline-flex items-center gap-1">
        <div className="flex items-center gap-0.5">
          <span 
            className={`w-2 h-2 rounded-full bg-gray-500 transition-opacity duration-200 ${dots >= 1 ? 'opacity-100' : 'opacity-40'}`}
            style={{ animationDelay: '0ms' }}
          />
          <span 
            className={`w-2 h-2 rounded-full bg-gray-500 transition-opacity duration-200 ${dots >= 2 ? 'opacity-100' : 'opacity-40'}`}
            style={{ animationDelay: '150ms' }}
          />
          <span 
            className={`w-2 h-2 rounded-full bg-gray-500 transition-opacity duration-200 ${dots >= 3 ? 'opacity-100' : 'opacity-40'}`}
            style={{ animationDelay: '300ms' }}
          />
        </div>
      </div>
    </div>
  );
};