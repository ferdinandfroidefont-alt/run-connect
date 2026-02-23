import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Reply, Copy, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MessageLongPressMenuProps {
  isOpen: boolean;
  onClose: () => void;
  messageContent: string;
  isOwnMessage: boolean;
  onReaction: (emoji: string) => void;
  onReply: () => void;
  onDelete: () => void;
}

const QUICK_REACTIONS = ['❤️', '👍', '😂', '😮', '😢', '🔥'];

export const MessageLongPressMenu: React.FC<MessageLongPressMenuProps> = ({
  isOpen,
  onClose,
  messageContent,
  isOwnMessage,
  onReaction,
  onReply,
  onDelete,
}) => {
  const handleCopy = () => {
    navigator.clipboard.writeText(messageContent);
    onClose();
  };

  const handleReaction = (emoji: string) => {
    onReaction(emoji);
    onClose();
  };

  const handleReply = () => {
    onReply();
    onClose();
  };

  const handleDelete = () => {
    onDelete();
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[100] bg-black/60 flex flex-col items-center justify-center"
          onClick={onClose}
        >
          {/* Emoji reaction bar */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            transition={{ duration: 0.2, delay: 0.05 }}
            className="bg-card/95 backdrop-blur-xl rounded-full flex items-center gap-1 p-1.5 shadow-lg border border-border mb-4"
            onClick={(e) => e.stopPropagation()}
          >
            {QUICK_REACTIONS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => handleReaction(emoji)}
                className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-secondary active:scale-125 transition-all text-xl"
              >
                {emoji}
              </button>
            ))}
          </motion.div>

          {/* Actions menu */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            transition={{ duration: 0.2, delay: 0.1 }}
            className="bg-card/95 backdrop-blur-xl rounded-2xl shadow-lg border border-border overflow-hidden min-w-[200px]"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={handleReply}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-secondary active:bg-secondary/80 transition-colors text-foreground"
            >
              <Reply className="h-4 w-4 text-muted-foreground" />
              <span className="text-[15px]">Répondre</span>
            </button>
            
            <div className="h-px bg-border mx-2" />
            
            <button
              onClick={handleCopy}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-secondary active:bg-secondary/80 transition-colors text-foreground"
            >
              <Copy className="h-4 w-4 text-muted-foreground" />
              <span className="text-[15px]">Copier</span>
            </button>

            {isOwnMessage && (
              <>
                <div className="h-px bg-border mx-2" />
                <button
                  onClick={handleDelete}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-destructive/10 active:bg-destructive/20 transition-colors text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                  <span className="text-[15px]">Supprimer</span>
                </button>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
