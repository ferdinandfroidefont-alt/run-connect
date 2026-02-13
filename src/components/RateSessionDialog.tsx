import { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Star } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface RateSessionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionId: string;
  organizerId: string;
  organizerName: string;
  userId: string;
  onRated: () => void;
}

export const RateSessionDialog = ({
  open,
  onOpenChange,
  sessionId,
  organizerId,
  organizerName,
  userId,
  onRated,
}: RateSessionDialogProps) => {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (rating === 0) {
      toast({ title: 'Sélectionnez une note', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('session_ratings' as any)
        .insert({
          session_id: sessionId,
          reviewer_id: userId,
          organizer_id: organizerId,
          rating,
          comment: comment.trim() || null,
        });

      if (error) throw error;

      toast({ title: '⭐ Merci pour votre avis !' });
      onRated();
      onOpenChange(false);
    } catch (error: any) {
      if (error.code === '23505') {
        toast({ title: 'Vous avez déjà noté cette séance' });
      } else {
        toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
      }
    } finally {
      setLoading(false);
    }
  };

  const displayRating = hoveredRating || rating;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl max-w-[320px] p-0 gap-0 bg-background">
        <div className="p-6 text-center space-y-4">
          <div>
            <h3 className="text-[17px] font-semibold text-foreground">
              Noter la séance
            </h3>
            <p className="text-[13px] text-muted-foreground mt-1">
              Comment était la séance de {organizerName} ?
            </p>
          </div>

          {/* Star Rating */}
          <div className="flex justify-center gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <motion.button
                key={star}
                whileTap={{ scale: 0.85 }}
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoveredRating(star)}
                onMouseLeave={() => setHoveredRating(0)}
                className="p-1"
              >
                <Star
                  className={cn(
                    'h-9 w-9 transition-colors',
                    star <= displayRating
                      ? 'fill-amber-400 text-amber-400'
                      : 'text-muted-foreground/30'
                  )}
                />
              </motion.button>
            ))}
          </div>

          {displayRating > 0 && (
            <p className="text-[13px] text-muted-foreground">
              {displayRating === 1 && 'Décevant'}
              {displayRating === 2 && 'Peut mieux faire'}
              {displayRating === 3 && 'Correct'}
              {displayRating === 4 && 'Très bien'}
              {displayRating === 5 && 'Excellent !'}
            </p>
          )}

          {/* Comment */}
          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value.slice(0, 200))}
            placeholder="Un commentaire ? (optionnel)"
            rows={2}
            className="text-[15px] rounded-xl bg-secondary border-0 resize-none"
          />
          <p className="text-[11px] text-muted-foreground text-right">
            {comment.length}/200
          </p>
        </div>

        <div className="border-t border-border">
          <button
            onClick={() => onOpenChange(false)}
            className="w-full h-[44px] text-primary text-[17px] font-normal hover:bg-secondary/50 transition-colors"
          >
            Plus tard
          </button>
        </div>
        <div className="border-t border-border">
          <button
            onClick={handleSubmit}
            disabled={loading || rating === 0}
            className="w-full h-[44px] text-primary text-[17px] font-semibold hover:bg-secondary/50 transition-colors disabled:opacity-50"
          >
            {loading ? 'Envoi...' : 'Envoyer'}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
