import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { FeedActions } from './FeedActions';
import { FeedComments } from './FeedComments';
import { MiniMapPreview } from './MiniMapPreview';
import { motion } from 'framer-motion';
import { formatDistanceToNow, format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Calendar, MapPin, Users, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { FeedSession } from '@/hooks/useFeed';

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
  'bmx': '🏋️',
  'walking': '🚶',
  'football': '⚽',
  'basketball': '🏀',
  'volleyball': '🏐',
  'badminton': '🏸',
  'tennis': '🎾',
  'ping-pong': '🏓',
  'climbing': '🧗',
  'gravel': '🪨',
  'petanque': '🎯',
  'rugby': '🏉',
  'swimming': '🏊'
};

const activityColors: Record<string, { bg: string; shadow: string }> = {
  'running': { bg: 'from-orange-500 to-red-500', shadow: 'shadow-orange-500/30' },
  'trail': { bg: 'from-green-500 to-emerald-500', shadow: 'shadow-green-500/30' },
  'cycling': { bg: 'from-blue-500 to-cyan-500', shadow: 'shadow-blue-500/30' },
  'mtb': { bg: 'from-amber-500 to-orange-500', shadow: 'shadow-amber-500/30' },
  'walking': { bg: 'from-teal-500 to-green-500', shadow: 'shadow-teal-500/30' },
  'football': { bg: 'from-emerald-500 to-green-500', shadow: 'shadow-emerald-500/30' },
  'basketball': { bg: 'from-orange-500 to-amber-500', shadow: 'shadow-orange-500/30' },
  'swimming': { bg: 'from-cyan-500 to-blue-500', shadow: 'shadow-cyan-500/30' }
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
  const activityStyle = activityColors[session.activity_type] || { bg: 'from-primary to-accent', shadow: 'shadow-primary/30' };

  const scheduledDate = new Date(session.scheduled_at);
  const isUpcoming = scheduledDate > new Date();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4, scale: 1.01 }}
      transition={{ duration: 0.3 }}
      className="glass-card card-hover-glow overflow-hidden mb-4"
    >
      {/* Gradient top border */}
      <div className={`h-1 bg-gradient-to-r ${activityStyle.bg}`} />
      
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
            <Avatar className={`h-11 w-11 ring-2 ring-primary/40 shadow-lg ${activityStyle.shadow}`}>
              <AvatarImage src={session.organizer.avatar_url} />
              <AvatarFallback className={`bg-gradient-to-br ${activityStyle.bg} text-white font-semibold`}>
                {session.organizer.username[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </motion.div>
          <div>
            <p className="font-semibold text-sm">@{session.organizer.username}</p>
            <p className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(session.created_at), {
                addSuffix: true,
                locale: fr
              })}
            </p>
          </div>
        </div>

        {/* Activity Badge with gradient */}
        <Badge 
          className={`bg-gradient-to-r ${activityStyle.bg} text-white border-0 rounded-full px-3 py-1 text-xs font-medium shadow-lg ${activityStyle.shadow}`}
        >
          <span className="mr-1">{activityEmoji}</span>
          {session.activity_type}
        </Badge>
      </div>

      {/* Content */}
      <div className="px-4 pb-3 space-y-3">
        {/* Title */}
        <h3 className="font-bold text-lg leading-tight">{session.title}</h3>

        {/* Description */}
        {session.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {session.description}
          </p>
        )}

        {/* Info Grid with glass effect */}
        <div className="grid grid-cols-2 gap-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground glass-card px-3 py-2 rounded-xl">
            <MapPin className="h-4 w-4 text-primary" />
            <span className="truncate">{session.location_name}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground glass-card px-3 py-2 rounded-xl">
            <Users className="h-4 w-4 text-accent" />
            <span>
              {session.current_participants}
              {session.max_participants && `/${session.max_participants}`}
            </span>
          </div>
        </div>

        {/* Date/Time Banner with gradient */}
        <div className={`flex items-center gap-3 rounded-xl px-4 py-3 ${
          isUpcoming 
            ? 'bg-gradient-to-r from-primary/20 via-accent/10 to-primary/20 border border-primary/30' 
            : 'glass-card'
        }`}>
          <div className={`flex items-center justify-center h-10 w-10 rounded-full ${
            isUpcoming ? 'bg-gradient-to-br from-primary to-accent shadow-lg shadow-primary/30' : 'bg-muted'
          }`}>
            <Calendar className={`h-5 w-5 ${isUpcoming ? 'text-white' : 'text-muted-foreground'}`} />
          </div>
          <div>
            <p className="font-medium text-sm">
              {format(scheduledDate, "EEEE d MMMM", { locale: fr })}
            </p>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>{format(scheduledDate, "HH'h'mm", { locale: fr })}</span>
              {isUpcoming && (
                <Badge className="ml-2 text-[10px] px-1.5 py-0 bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0 shadow-lg shadow-green-500/30">
                  À venir
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Mini Map with gradient border */}
        <div className="w-full h-36 rounded-xl overflow-hidden border-gradient">
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
    </motion.div>
  );
};
