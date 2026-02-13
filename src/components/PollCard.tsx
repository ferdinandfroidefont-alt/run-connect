import { useState, useEffect } from 'react';
import { BarChart3, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface PollOption {
  id: string;
  text: string;
  votes: string[];
}

interface PollCardProps {
  pollId: string;
  className?: string;
}

export const PollCard = ({ pollId, className }: PollCardProps) => {
  const { user } = useAuth();
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState<PollOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState(false);

  const totalVotes = options.reduce((acc, opt) => acc + opt.votes.length, 0);
  const userVotedOptionId = options.find((o) => user && o.votes.includes(user.id))?.id;

  useEffect(() => {
    fetchPoll();
  }, [pollId]);

  const fetchPoll = async () => {
    try {
      const { data, error } = await supabase
        .from('polls' as any)
        .select('question, options')
        .eq('id', pollId)
        .single();

      if (error || !data) return;
      setQuestion((data as any).question);
      setOptions((data as any).options as PollOption[]);
    } catch (err) {
      console.error('Error fetching poll:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (optionId: string) => {
    if (!user || voting) return;

    setVoting(true);
    try {
      const updatedOptions = options.map((opt) => {
        const filteredVotes = opt.votes.filter((v) => v !== user.id);
        if (opt.id === optionId) {
          return { ...opt, votes: [...filteredVotes, user.id] };
        }
        return { ...opt, votes: filteredVotes };
      });

      const { error } = await supabase
        .from('polls' as any)
        .update({ options: updatedOptions })
        .eq('id', pollId);

      if (error) throw error;
      setOptions(updatedOptions);
    } catch (err) {
      console.error('Error voting:', err);
    } finally {
      setVoting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-3 rounded-xl bg-secondary/50 animate-pulse">
        <div className="h-4 w-32 bg-muted rounded mb-3" />
        <div className="space-y-2">
          <div className="h-8 bg-muted rounded-lg" />
          <div className="h-8 bg-muted rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className={cn('rounded-xl bg-background border border-border overflow-hidden', className)}>
      <div className="p-3">
        <div className="flex items-center gap-2 mb-2.5">
          <BarChart3 className="h-4 w-4 text-primary" />
          <p className="text-[15px] font-semibold text-foreground">{question}</p>
        </div>

        <div className="space-y-1.5">
          {options.map((opt) => {
            const pct = totalVotes > 0 ? Math.round((opt.votes.length / totalVotes) * 100) : 0;
            const isVoted = opt.id === userVotedOptionId;
            const hasVoted = !!userVotedOptionId;

            return (
              <button
                key={opt.id}
                onClick={() => handleVote(opt.id)}
                disabled={voting}
                className={cn(
                  'relative w-full text-left rounded-lg overflow-hidden transition-all',
                  'px-3 py-2 text-[14px]',
                  isVoted
                    ? 'bg-primary/10 border border-primary/30'
                    : 'bg-secondary border border-transparent hover:border-border'
                )}
              >
                {/* Progress bar background */}
                {hasVoted && (
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.4, ease: 'easeOut' }}
                    className={cn(
                      'absolute inset-y-0 left-0 rounded-lg',
                      isVoted ? 'bg-primary/15' : 'bg-muted-foreground/5'
                    )}
                  />
                )}

                <div className="relative flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {isVoted && (
                      <Check className="h-3.5 w-3.5 text-primary" />
                    )}
                    <span className={cn(
                      'text-foreground',
                      isVoted && 'font-medium'
                    )}>
                      {opt.text}
                    </span>
                  </div>
                  {hasVoted && (
                    <span className="text-[12px] text-muted-foreground font-medium ml-2">
                      {pct}%
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        <p className="text-[11px] text-muted-foreground mt-2">
          {totalVotes} vote{totalVotes !== 1 ? 's' : ''}
        </p>
      </div>
    </div>
  );
};
