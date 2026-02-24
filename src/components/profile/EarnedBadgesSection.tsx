import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Medal, ChevronRight } from "lucide-react";

interface Badge {
  id: string;
  badge_id: string;
  badge_name: string;
  badge_icon: string | null;
  badge_description: string | null;
  unlocked_at: string | null;
}

interface EarnedBadgesSectionProps {
  userId: string;
  onBadgesClick?: () => void;
}

export const EarnedBadgesSection = ({ userId, onBadgesClick }: EarnedBadgesSectionProps) => {
  const [badges, setBadges] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBadges();
  }, [userId]);

  const fetchBadges = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('user_badges')
        .select('*')
        .eq('user_id', userId)
        .order('unlocked_at', { ascending: false });

      if (error) throw error;
      setBadges(data || []);
    } catch (error) {
      console.error('Error fetching badges:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-card rounded-[10px] overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="h-[30px] w-[30px] rounded-[7px] bg-secondary animate-pulse" />
          <div className="flex-1 h-5 bg-secondary rounded animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-[10px] overflow-hidden">
      {/* Badges Row - iOS TableViewCell Style */}
      <button
        onClick={onBadgesClick}
        className="w-full flex items-center gap-3 px-4 py-3 active:bg-secondary transition-colors"
      >
        <div className="h-[30px] w-[30px] rounded-[7px] bg-yellow-500 flex items-center justify-center">
          <Medal className="h-[18px] w-[18px] text-white" />
        </div>
        <div className="flex-1 flex items-center justify-between">
          <span className="text-[17px] text-foreground">Badges débloqués</span>
          <div className="flex items-center gap-2">
            {badges.length > 0 ? (
              <div className="flex -space-x-1">
                {badges.slice(0, 4).map((b, i) => (
                  <div
                    key={b.id}
                    className="h-6 w-6 rounded-full bg-yellow-100 border-2 border-card flex items-center justify-center text-sm"
                    style={{ zIndex: 4 - i }}
                  >
                    {b.badge_icon || "🏅"}
                  </div>
                ))}
                {badges.length > 4 && (
                  <div className="h-6 w-6 rounded-full bg-secondary border-2 border-card flex items-center justify-center text-[10px] font-medium text-muted-foreground">
                    +{badges.length - 4}
                  </div>
                )}
              </div>
            ) : (
              <span className="text-[15px] text-muted-foreground">Aucun</span>
            )}
            <ChevronRight className="h-5 w-5 text-muted-foreground/50" />
          </div>
        </div>
      </button>
    </div>
  );
};
