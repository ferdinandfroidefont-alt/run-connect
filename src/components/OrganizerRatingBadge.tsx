import { useState, useEffect } from 'react';
import { Star } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface OrganizerRatingBadgeProps {
  userId: string;
  className?: string;
  showCount?: boolean;
}

export const OrganizerRatingBadge = ({ userId, className, showCount = false }: OrganizerRatingBadgeProps) => {
  const [avgRating, setAvgRating] = useState<number | null>(null);
  const [ratingCount, setRatingCount] = useState(0);

  useEffect(() => {
    const fetchRating = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('organizer_avg_rating')
        .eq('user_id', userId)
        .single();

      if (data?.organizer_avg_rating) {
        setAvgRating(Number(data.organizer_avg_rating));
      }

      if (showCount) {
        const { count } = await supabase
          .from('session_ratings' as any)
          .select('*', { count: 'exact', head: true })
          .eq('organizer_id', userId);
        setRatingCount(count || 0);
      }
    };

    fetchRating();
  }, [userId, showCount]);

  if (avgRating === null) return null;

  return (
    <div className={cn('inline-flex items-center gap-1', className)}>
      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
      <span className="text-[13px] font-semibold text-foreground">
        {avgRating.toFixed(1)}
      </span>
      {showCount && ratingCount > 0 && (
        <span className="text-[11px] text-muted-foreground">
          ({ratingCount})
        </span>
      )}
    </div>
  );
};
