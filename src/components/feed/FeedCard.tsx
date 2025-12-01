import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { FeedActions } from './FeedActions';
import { FeedComments } from './FeedComments';
import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { format } from 'date-fns';
import { Calendar, MapPin, Users } from 'lucide-react';
import type { FeedSession } from '@/hooks/useFeed';
import { generateRunConnectMarkerSVG, svgToDataUrl } from '@/lib/map-marker-generator';

interface FeedCardProps {
  session: FeedSession;
  onLike: (sessionId: string) => void;
  onUnlike: (sessionId: string) => void;
  onAddComment: (sessionId: string, content: string) => void;
  onJoinSession: (sessionId: string) => void;
  onViewComments: (sessionId: string) => void;
}

const activityEmojis: Record<string, string> = {
  'running': '🏃',
  'trail': '🏃‍♀️',
  'cycling': '🚴',
  'mtb': '🚵',
  'walking': '🚶',
  'football': '⚽',
  'basketball': '🏀',
  'swimming': '🏊'
};

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

  const activityEmoji = activityEmojis[session.activity_type] || '🏃';

  // Generate custom marker with profile photo
  const markerSvg = generateRunConnectMarkerSVG(session.organizer.avatar_url || '', 48);
  const markerDataUrl = svgToDataUrl(markerSvg);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-card/30 backdrop-blur-sm border border-white/10 rounded-2xl overflow-hidden shadow-lg mb-4"
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3">
        <Avatar className="h-10 w-10 ring-2 ring-primary/30">
          <AvatarImage src={session.organizer.avatar_url} />
          <AvatarFallback>
            {session.organizer.username[0]?.toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm">@{session.organizer.username}</p>
          <p className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(session.created_at), {
              addSuffix: true,
              locale: fr
            })}
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-3 space-y-3">
        <div className="flex items-center gap-2 text-lg">
          <span>{activityEmoji}</span>
          <span className="font-semibold">{session.title}</span>
        </div>

        {session.description && (
          <p className="text-sm text-muted-foreground">{session.description}</p>
        )}

        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="h-4 w-4" />
            <span>{session.location_name}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>
              {format(new Date(session.scheduled_at), "EEEE d MMMM 'à' HH'h'mm", {
                locale: fr
              })}
            </span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Users className="h-4 w-4" />
            <span>
              {session.current_participants}
              {session.max_participants && `/${session.max_participants}`} participants
            </span>
          </div>
        </div>

        {/* Mini Map with Custom Marker */}
        <div className="relative w-full h-40 rounded-xl overflow-hidden bg-muted">
          <iframe
            className="w-full h-full"
            loading="lazy"
            allowFullScreen
            referrerPolicy="no-referrer-when-downgrade"
            src={`https://www.google.com/maps/embed/v1/view?key=AIzaSyDH-lVLOBo0bK5l-sNBFQI_e6gqbMx_L8g&center=${session.location_lat},${session.location_lng}&zoom=14&maptype=roadmap`}
          />
          {/* Custom RunConnect Marker Overlay */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-full pointer-events-none">
            <img 
              src={markerDataUrl} 
              alt="Marker"
              className="w-12 h-15"
            />
          </div>
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
    </motion.div>
  );
};