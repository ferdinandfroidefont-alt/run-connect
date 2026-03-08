import { Target } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ScrollToMyRankButtonProps {
  onClick: () => void;
  visible: boolean;
  rank: number;
}

export const ScrollToMyRankButton = ({ onClick, visible, rank }: ScrollToMyRankButtonProps) => {
  return (
    <AnimatePresence>
      {visible && (
        <motion.button
          initial={{ opacity: 0, y: 20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.9 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          onClick={onClick}
          className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2.5 rounded-full bg-card/80 backdrop-blur-xl border border-border/50 shadow-lg shadow-black/10 active:scale-95 transition-transform"
        >
          <Target className="h-4 w-4 text-primary" />
          <span className="text-[14px] font-semibold text-foreground">#{rank}</span>
          <span className="text-[13px] text-muted-foreground">· Ma position</span>
        </motion.button>
      )}
    </AnimatePresence>
  );
};
