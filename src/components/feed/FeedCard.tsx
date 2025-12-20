import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { FeedActions } from './FeedActions';
import { FeedComments } from './FeedComments';
import { MiniMapPreview } from './MiniMapPreview';
import { formatDistanceToNow, format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Calendar, MapPin, Users } from 'lucide-react';
import type { FeedSession } from '@/hooks/useFeed';

interface FeedCardProps {
  session: FeedSession;
  onLike: (sessionId: string) => void;
  onUnlike: (sessionId: string) => void;
  onAddComment: (sessionId: string, content: string) => void;
  onJoinSession: (sessionId: string) => void;
  onViewComments: (sessionId: string) => void;
}

export const FeedCard = ({
  session,
  onLike,
  onUnlike,
  onAddComment,
  onJoinSession,
  onViewComments
}: FeedCardProps) => {
  const handleLike = () => {
    if (session.is_liked) {
      onUnlike(session.id);
    } else {
      onLike(session.id);
    }
  };

  const scheduledDate = new Date(session.scheduled_at);
  const isUpcoming = scheduledDate > new Date();

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden mb-4">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={session.organizer.avatar_url} />
            <AvatarFallback className="bg-secondary text-secondary-foreground text-sm font-medium">
              {session.organizer.username[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium text-sm">@{session.organizer.username}</p>
            <p className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(session.created_at), {
                addSuffix: true,
                locale: fr
              })}
            </p>
          </div>
        </div>

        {isUpcoming && (
          <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded-full">
            À venir
          </span>
        )}
      </div>

      {/* Content */}
      <div className="px-4 pb-3 space-y-3">
        <h3 className="font-semibold text-base">{session.title}</h3>

        {session.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {session.description}
          </p>
        )}

        {/* Info */}
        <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Calendar className="h-4 w-4" />
            <span>{format(scheduledDate, "d MMM · HH'h'mm", { locale: fr })}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <MapPin className="h-4 w-4" />
            <span className="truncate max-w-[150px]">{session.location_name}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Users className="h-4 w-4" />
            <span>
              {session.current_participants}
              {session.max_participants && `/${session.max_participants}`}
            </span>
          </div>
        </div>

        {/* Mini Map */}
        <div className="w-full h-32 rounded-lg overflow-hidden border border-border">
          <MiniMapPreview 
            lat={session.location_lat}
            lng={session.location_lng}
            profileImageUrl={session.organizer.avatar_url || ''}
            sessionId={session.id}
          />
        </div>
      </div>

      {/* Actions */}
      <FeedActions
        sessionId={session.id}
        likesCount={session.likes_count}
        commentsCount={session.comments_count}
        isLiked={session.is_liked}
        onLike={handleLike}
        onComment={() => onViewComments(session.id)}
        onJoin={() => onJoinSession(session.id)}
      />

      {/* Comments */}
      {session.latest_comments.length > 0 && (
        <FeedComments
          comments={session.latest_comments}
          totalComments={session.comments_count}
          onAddComment={(content) => onAddComment(session.id, content)}
          onViewAll={() => onViewComments(session.id)}
        />
      )}
    </div>
  );
};
