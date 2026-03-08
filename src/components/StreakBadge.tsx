import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Flame } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface StreakBadgeProps {
  userId: string;
  variant?: 'compact' | 'full';
  className?: string;
}

/**
 * Calculates consecutive days streak based on:
 * - Session creation (sessions.organizer_id)
 * - Coaching session creation (coaching_sessions.coach_id)
 * - Route creation (routes.created_by)
 */
export const StreakBadge = ({ userId, variant = 'compact', className }: StreakBadgeProps) => {
  const [streakDays, setStreakDays] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    computeStreak();
  }, [userId]);

  const computeStreak = async () => {
    try {
      // Fetch creation dates from all 3 sources in parallel
      const [sessionsRes, coachingRes, routesRes] = await Promise.all([
        supabase
          .from('sessions')
          .select('created_at')
          .eq('organizer_id', userId)
          .order('created_at', { ascending: false })
          .limit(200),
        supabase
          .from('coaching_sessions')
          .select('created_at')
          .eq('coach_id', userId)
          .order('created_at', { ascending: false })
          .limit(200),
        supabase
          .from('routes')
          .select('created_at')
          .eq('created_by', userId)
          .order('created_at', { ascending: false })
          .limit(200),
      ]);

      // Collect all dates (as YYYY-MM-DD strings in local timezone)
      const allDates = new Set<string>();

      const addDates = (data: { created_at: string }[] | null) => {
        data?.forEach(row => {
          const d = new Date(row.created_at);
          const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
          allDates.add(dateStr);
        });
      };

      addDates(sessionsRes.data);
      addDates(coachingRes.data);
      addDates(routesRes.data);

      // Calculate consecutive days streak from today backwards
      const today = new Date();
      let streak = 0;

      for (let i = 0; i < 365; i++) {
        const checkDate = new Date(today);
        checkDate.setDate(today.getDate() - i);
        const dateStr = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, '0')}-${String(checkDate.getDate()).padStart(2, '0')}`;

        if (allDates.has(dateStr)) {
          streak++;
        } else {
          // Allow skipping today if no activity yet (check from yesterday)
          if (i === 0) continue;
          break;
        }
      }

      setStreakDays(streak);
    } catch (err) {
      console.error('Error computing streak:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return null;

  const isActive = streakDays > 0;

  const getStreakConfig = (days: number) => {
    if (days >= 30) return { color: 'bg-red-500', label: 'Inarrêtable !', glow: true };
    if (days >= 14) return { color: 'bg-orange-500', label: 'En feu !', glow: true };
    if (days >= 7) return { color: 'bg-amber-500', label: 'Belle série !', glow: false };
    if (days >= 1) return { color: 'bg-red-500', label: 'Bonne dynamique', glow: false };
    return { color: 'bg-muted', label: 'Aucune série', glow: false };
  };

  const config = getStreakConfig(streakDays);

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
          {streakDays}
        </span>
      </motion.div>
    );
  }

  return (
    <div className={cn("bg-card rounded-[10px] overflow-hidden", className)}>
      <div className="px-4 py-3">
        <div className="flex items-center gap-2 mb-2">
          <Flame className={cn("h-5 w-5", isActive ? "text-red-500" : "text-muted-foreground")} />
          <span className="text-[17px] font-bold">{streakDays} jour{streakDays > 1 ? 's' : ''}</span>
        </div>
        <p className="text-[15px] text-muted-foreground">{config.label}</p>
        <div className="flex gap-1 mt-2">
          {Array.from({ length: Math.min(Math.max(streakDays, 1), 14) }).map((_, i) => (
            <motion.div
              key={i}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: i * 0.05 }}
              className={cn(
                "h-2 flex-1 rounded-full",
                i < streakDays ? config.color : "bg-secondary"
              )}
            />
          ))}
        </div>
        <p className="text-[13px] text-muted-foreground mt-1.5">
          {streakDays} jour{streakDays > 1 ? 's' : ''} consécutif{streakDays > 1 ? 's' : ''} d'activité
        </p>
        <p className="text-[11px] text-muted-foreground/60 mt-0.5">
          Création de séance, programme ou itinéraire
        </p>
      </div>
    </div>
  );
};
