import { Progress } from "@/components/ui/progress";
import { 
  Target, Users, Calendar, Award, Trophy, UserPlus, 
  MessageCircle, Mic, Image, Heart, Flag, Clock, ChevronRight
} from "lucide-react";
import { useWeeklyChallenges } from "@/hooks/useWeeklyChallenges";
import { useChallengeNotifications } from "@/hooks/useChallengeNotifications";
import { Skeleton } from "@/components/ui/skeleton";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

const iconMap: Record<string, any> = {
  Target,
  Users,
  Calendar,
  Award,
  Trophy,
  UserPlus,
  MessageCircle,
  Mic,
  Image,
  Heart,
  Flag
};

export const WeeklyChallengesCard = () => {
  const { challenges, loading } = useWeeklyChallenges();
  const { completedChallenge, almostDoneChallenge } = useChallengeNotifications();
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date();
      const nextMonday = new Date(now);
      
      const daysUntilMonday = (8 - now.getDay()) % 7 || 7;
      nextMonday.setDate(now.getDate() + daysUntilMonday);
      nextMonday.setHours(0, 0, 0, 0);
      
      const diff = nextMonday.getTime() - now.getTime();
      
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      
      return `${days}j ${hours}h`;
    };

    setTimeLeft(calculateTimeLeft());
    const interval = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="bg-card rounded-[10px] overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <div className="h-[30px] w-[30px] rounded-[7px] bg-secondary animate-pulse" />
          <div className="flex-1 h-5 bg-secondary rounded animate-pulse" />
        </div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="px-4 py-3">
            <Skeleton className="h-16 w-full" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="bg-card rounded-[10px] overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
        <div className="h-[30px] w-[30px] rounded-[7px] bg-red-500 flex items-center justify-center">
          <Target className="h-[18px] w-[18px] text-white" />
        </div>
        <div className="flex-1">
          <span className="text-[17px] font-semibold text-foreground">Défis de la semaine</span>
        </div>
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-secondary">
          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-[13px] text-muted-foreground">{timeLeft}</span>
        </div>
      </div>

      {/* Challenges List */}
      {challenges.length === 0 ? (
        <div className="px-4 py-6 text-center text-muted-foreground text-[15px]">
          Aucun défi actif pour le moment
        </div>
      ) : (
        challenges.map((challenge, index) => {
          const Icon = iconMap[challenge.icon] || Target;
          const progressPercentage = (challenge.progress / challenge.target) * 100;
          const isCompleted = challenge.progress >= challenge.target;
          const isJustCompleted = completedChallenge === challenge.id;
          const isAlmostDone = almostDoneChallenge === challenge.id;
          const isLast = index === challenges.length - 1;

          return (
            <div key={challenge.id}>
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative px-4 py-3"
              >
                <AnimatePresence>
                  {isJustCompleted && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.5 }}
                      className="absolute inset-0 pointer-events-none flex items-center justify-center text-4xl z-10"
                    >
                      🎉
                    </motion.div>
                  )}
                  {isAlmostDone && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: [0, 1, 0] }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 1, repeat: 2 }}
                      className="absolute inset-0 border-2 border-orange-500/50 rounded-lg pointer-events-none mx-4"
                    />
                  )}
                </AnimatePresence>

                <div className="flex items-start gap-3">
                  <div className={cn(
                    "h-[30px] w-[30px] rounded-[7px] flex items-center justify-center shrink-0 mt-0.5",
                    isCompleted ? "bg-green-500" : "bg-primary"
                  )}>
                    <Icon className="h-[18px] w-[18px] text-white" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          "text-[15px] font-medium",
                          isCompleted ? "text-green-600" : "text-foreground"
                        )}>
                          {challenge.title}
                        </p>
                        {challenge.description && (
                          <p className="text-[13px] text-muted-foreground mt-0.5 line-clamp-2">
                            {challenge.description}
                          </p>
                        )}
                      </div>
                      
                      {isCompleted ? (
                        <motion.span
                          initial={{ scale: 0, rotate: -180 }}
                          animate={{ 
                            scale: isJustCompleted ? [1, 1.3, 1] : 1,
                            rotate: 0
                          }}
                          transition={{ duration: 0.6, type: "spring" }}
                          className="text-xs bg-green-500 text-white px-2 py-0.5 rounded-full font-medium shrink-0"
                        >
                          ✓ Terminé
                        </motion.span>
                      ) : (
                        <span className="text-[13px] font-medium text-primary shrink-0">
                          +{challenge.reward} pts
                        </span>
                      )}
                    </div>
                    
                    <div className="mt-2 space-y-1">
                      <Progress 
                        value={Math.min(progressPercentage, 100)} 
                        className={cn("h-2", isCompleted ? "[&>div]:bg-green-500" : "")}
                      />
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-muted-foreground">
                          {challenge.progress}/{challenge.target}
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          {Math.round(progressPercentage)}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
              {!isLast && <div className="h-px bg-border ml-[54px]" />}
            </div>
          );
        })
      )}
    </div>
  );
};
