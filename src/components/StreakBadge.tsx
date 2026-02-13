import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Flame, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface StreakBadgeProps {
  userId: string;
  variant?: 'compact' | 'full';
  className?: string;
}

export const StreakBadge = ({ userId, variant = 'compact', className }: StreakBadgeProps) => {
  const [streakWeeks, setStreakWeeks] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStreak();
  }, [userId]);

  const fetchStreak = async () => {
    try {
      const { data, error } = await supabase
        .from('user_stats')
        .select('streak_weeks')
        .eq('user_id', userId)
        .maybeSingle();

      if (!error && data) {
        setStreakWeeks(data.streak_weeks || 0);
      }
    } catch (err) {
      console.error('Error fetching streak:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return null;

  const isActive = streakWeeks > 0;

  const getStreakConfig = (weeks: number) => {
    if (weeks >= 12) return { color: 'bg-red-500', textColor: 'text-red-500', iconColor: 'text-white', label: 'Inarrêtable !', glow: true };
    if (weeks >= 8) return { color: 'bg-orange-500', textColor: 'text-orange-500', iconColor: 'text-white', label: 'En feu !', glow: true };
    if (weeks >= 4) return { color: 'bg-amber-500', textColor: 'text-amber-500', iconColor: 'text-white', label: 'Belle série !', glow: false };
    if (weeks >= 1) return { color: 'bg-red-500', textColor: 'text-red-500', iconColor: 'text-white', label: 'Bonne dynamique', glow: false };
    return { color: 'bg-muted', textColor: 'text-muted-foreground', iconColor: 'text-muted-foreground', label: 'Aucune série', glow: false };
  };

  const config = getStreakConfig(streakWeeks);

  if (variant === 'compact') {
    return (
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className={cn(
          "inline-flex items-center gap-1 px-2 py-1 rounded-full",
          isActive ? "bg-red-500/10" : "bg-muted",
          className
        )}
      >
        <Flame className={cn("h-4 w-4", isActive ? "text-red-500" : "text-muted-foreground")} />
        <span className={cn("text-[13px] font-semibold", isActive ? "text-red-500" : "text-muted-foreground")}>
          {streakWeeks}
        </span>
      </motion.div>
    );
  }

  return (
    <div className={cn("bg-card rounded-[10px] overflow-hidden", className)}>
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
        <motion.div
          className={cn("h-[30px] w-[30px] rounded-[7px] flex items-center justify-center", config.color)}
          animate={config.glow ? { scale: [1, 1.1, 1] } : {}}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          <Flame className={cn("h-[18px] w-[18px]", config.iconColor)} />
        </motion.div>
        <div className="flex-1 flex items-center justify-between">
          <span className="text-[17px] font-semibold text-foreground">{isActive ? 'Série en cours' : 'Aucune série'}</span>
          <div className={cn("flex items-center gap-1 px-2 py-0.5 rounded-full bg-secondary", config.textColor)}>
            <Flame className={cn("h-3.5 w-3.5", isActive ? "text-red-500" : "text-muted-foreground")} />
            <span className="text-[13px] font-bold">{streakWeeks} sem.</span>
          </div>
        </div>
      </div>
      <div className="px-4 py-3">
        <p className="text-[15px] text-muted-foreground">{config.label}</p>
        <div className="flex gap-1 mt-2">
          {Array.from({ length: Math.min(streakWeeks, 12) }).map((_, i) => (
            <motion.div
              key={i}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: i * 0.05 }}
              className={cn(
                "h-2 flex-1 rounded-full",
                i < streakWeeks ? config.color : "bg-secondary"
              )}
            />
          ))}
        </div>
        <p className="text-[13px] text-muted-foreground mt-1.5">
          {streakWeeks} semaine{streakWeeks > 1 ? 's' : ''} consécutive{streakWeeks > 1 ? 's' : ''} avec activité
        </p>
      </div>
    </div>
  );
};
