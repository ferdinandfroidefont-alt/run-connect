import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

interface Reaction {
  emoji: string;
  count: number;
  hasReacted: boolean;
  users: string[];
}

interface MessageReactionsProps {
  messageId: string;
  reactions: Array<{
    id: string;
    emoji: string;
    user_id: string;
  }>;
  onReactionChange?: () => void;
  isOwnMessage?: boolean;
}

const QUICK_REACTIONS = ['❤️', '👍', '😂', '😮', '😢', '🔥'];

export const MessageReactions: React.FC<MessageReactionsProps> = ({
  messageId,
  reactions,
  onReactionChange,
  isOwnMessage = false,
}) => {
  const { user } = useAuth();
  const [showPicker, setShowPicker] = useState(false);

  // Group reactions by emoji
  const groupedReactions: Reaction[] = React.useMemo(() => {
    const groups: { [emoji: string]: { count: number; hasReacted: boolean; users: string[] } } = {};
    
    reactions.forEach((reaction) => {
      if (!groups[reaction.emoji]) {
        groups[reaction.emoji] = { count: 0, hasReacted: false, users: [] };
      }
      groups[reaction.emoji].count++;
      groups[reaction.emoji].users.push(reaction.user_id);
      if (reaction.user_id === user?.id) {
        groups[reaction.emoji].hasReacted = true;
      }
    });

    return Object.entries(groups).map(([emoji, data]) => ({
      emoji,
      ...data,
    }));
  }, [reactions, user?.id]);

  const handleReaction = async (emoji: string) => {
    if (!user) return;

    const existingReaction = reactions.find(
      (r) => r.emoji === emoji && r.user_id === user.id
    );

    try {
      if (existingReaction) {
        // Remove reaction
        await supabase
          .from('message_reactions')
          .delete()
          .eq('id', existingReaction.id);
      } else {
        // Add reaction
        await supabase
          .from('message_reactions')
          .insert({
            message_id: messageId,
            user_id: user.id,
            emoji,
          });
      }

      onReactionChange?.();
    } catch (error) {
      console.error('Error toggling reaction:', error);
    }

    setShowPicker(false);
  };

  return (
    <div className={cn("relative", isOwnMessage ? "text-right" : "text-left")}>
      {/* Displayed reactions */}
      <div className={cn(
        "flex flex-wrap gap-1 mt-1 items-center",
        isOwnMessage ? "justify-end" : "justify-start"
      )}>
        {groupedReactions.map((reaction) => (
          <motion.button
            key={reaction.emoji}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            onClick={() => handleReaction(reaction.emoji)}
            className={cn(
              "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-sm transition-all",
              "border",
              reaction.hasReacted
                ? "bg-primary/20 border-primary/30"
                : "bg-secondary/50 border-border hover:bg-secondary"
            )}
          >
            <span>{reaction.emoji}</span>
            {reaction.count > 1 && (
              <span className="text-xs text-muted-foreground">{reaction.count}</span>
            )}
          </motion.button>
        ))}
        
        {/* Add reaction button */}
        <button
          onClick={() => setShowPicker(!showPicker)}
          className={cn(
            "w-6 h-6 rounded-full flex items-center justify-center transition-all",
            "bg-secondary/50 border border-border hover:bg-secondary",
            showPicker && "bg-primary/20 border-primary/30"
          )}
        >
          <Plus className="w-3 h-3 text-muted-foreground" />
        </button>
      </div>

      {/* Quick reaction picker */}
      <AnimatePresence>
        {showPicker && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 10 }}
            className={cn(
              "absolute z-50 mt-1",
              "bg-card rounded-full shadow-lg border border-border",
              "flex items-center gap-1 p-1",
              isOwnMessage ? "right-0 left-0 mx-auto w-fit" : "left-0 right-0 mx-auto w-fit"
            )}
          >
            {QUICK_REACTIONS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => handleReaction(emoji)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-secondary transition-colors text-lg"
              >
                {emoji}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Hook to add reaction picker trigger to messages
export const useMessageReactionPicker = () => {
  const [activeMessageId, setActiveMessageId] = useState<string | null>(null);

  const togglePicker = (messageId: string) => {
    setActiveMessageId(prev => prev === messageId ? null : messageId);
  };

  const closePicker = () => {
    setActiveMessageId(null);
  };

  return {
    activeMessageId,
    togglePicker,
    closePicker,
  };
};