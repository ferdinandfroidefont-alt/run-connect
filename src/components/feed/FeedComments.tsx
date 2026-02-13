import { useState } from 'react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Send } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

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
    <div className="px-4 py-3 space-y-3">
      {totalComments > 2 && (
        <button
          onClick={onViewAll}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Voir les {totalComments} commentaires
        </button>
      )}

      {comments.map((comment) => (
        <div key={comment.id} className="flex gap-2">
          <Avatar className="h-6 w-6">
            <AvatarImage src={comment.user.avatar_url} />
            <AvatarFallback>{comment.user.username[0]?.toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm">
              <span className="font-medium">{comment.user.username}</span>{' '}
              <span className="text-muted-foreground">{comment.content}</span>
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {formatDistanceToNow(new Date(comment.created_at), {
                addSuffix: true,
                locale: fr
              })}
            </p>
          </div>
        </div>
      ))}

      <form onSubmit={handleSubmit} className="flex gap-2 pt-2">
        <Input
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Ajouter un commentaire..."
          className="flex-1 h-9 text-sm rounded-full bg-secondary border-border"
        />
        <Button
          type="submit"
          size="sm"
          disabled={!newComment.trim()}
          className="h-9 w-9 p-0 rounded-full bg-primary hover:bg-primary/90"
        >
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
};