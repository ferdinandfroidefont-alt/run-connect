import { useState } from 'react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { initials } from '@/components/feed/FeedSessionTile';

/** Aligné maquette DiscussionSheet — même tokens que SessionDiscussionView */
const ACTION_BLUE = '#007AFF';
const TEXT_PRIMARY = '#0A0F1F';
const TEXT_MUTED = '#8E8E93';
const BORDER_SEP = '#E5E5EA';
const CARD_SHADOW = '0 1px 3px rgba(0,0,0,0.04), 0 0 0 0.5px rgba(0,0,0,0.06)';
const SEND_DISABLED = '#C7C7CC';

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user: {
    username: string;
    avatar_url: string;
  };
}

interface FeedCommentsProps {
  comments: Comment[];
  totalComments: number;
  onAddComment: (content: string) => void;
  onViewAll: () => void;
}

export const FeedComments = ({
  comments,
  totalComments,
  onAddComment,
  onViewAll
}: FeedCommentsProps) => {
  const [newComment, setNewComment] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newComment.trim()) {
      onAddComment(newComment);
      setNewComment('');
    }
  };

  return (
    <div className="space-y-2.5 px-4 py-3">
      {totalComments > 2 && (
        <button
          type="button"
          onClick={onViewAll}
          className="w-full rounded-[14px] px-3 py-2 text-left text-[15px] font-medium transition-opacity active:opacity-70"
          style={{ color: TEXT_MUTED, background: 'white', boxShadow: CARD_SHADOW }}
        >
          Voir les {totalComments} commentaires
        </button>
      )}

      {comments.map((comment) => (
        <div
          key={comment.id}
          className="flex items-start gap-3 p-3"
          style={{
            background: 'white',
            borderRadius: 14,
            boxShadow: CARD_SHADOW,
          }}
        >
          <Avatar className="h-9 w-9 flex-shrink-0">
            <AvatarImage src={comment.user.avatar_url} className="object-cover" />
            <AvatarFallback
              className="text-[14px] font-extrabold text-white"
              style={{ background: ACTION_BLUE }}
            >
              {initials(comment.user.username)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-2">
              <p
                className="m-0 truncate text-[14px] font-extrabold tracking-tight"
                style={{ color: TEXT_PRIMARY, letterSpacing: '-0.01em' }}
              >
                {comment.user.username}
              </p>
              <p className="m-0 shrink-0 text-[12px]" style={{ color: TEXT_MUTED }}>
                {formatDistanceToNow(new Date(comment.created_at), {
                  addSuffix: true,
                  locale: fr
                })}
              </p>
            </div>
            <p
              className="m-0 mt-[3px] whitespace-pre-wrap break-words text-[15px] leading-[1.35]"
              style={{ color: TEXT_PRIMARY }}
            >
              {comment.content}
            </p>
          </div>
        </div>
      ))}

      <form onSubmit={handleSubmit} className="flex items-center gap-2 pt-1">
        <div
          className="flex flex-1 items-center rounded-full border px-4 py-[10px]"
          style={{ borderColor: BORDER_SEP, background: 'white' }}
        >
          <input
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Ajouter un commentaire"
            className="min-w-0 flex-1 border-0 bg-transparent p-0 outline-none"
            style={{ fontSize: 15, color: TEXT_PRIMARY, fontWeight: 500 }}
          />
        </div>
        <button
          type="submit"
          disabled={!newComment.trim()}
          className="flex-shrink-0 px-2 py-2 transition-transform active:scale-[0.96]"
        >
          <span
            className="text-[16px] font-bold tracking-tight"
            style={{
              color: newComment.trim() ? ACTION_BLUE : SEND_DISABLED,
              letterSpacing: '-0.01em',
            }}
          >
            Envoyer
          </span>
        </button>
      </form>
    </div>
  );
};
