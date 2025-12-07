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

const activityColors: Record<string, string> = {
  'running': 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  'trail': 'bg-green-500/20 text-green-400 border-green-500/30',
  'cycling': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  'mtb': 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  'walking': 'bg-teal-500/20 text-teal-400 border-teal-500/30',
  'football': 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  'basketball': 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  'swimming': 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30'
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
  const activityColor = activityColors[session.activity_type] || 'bg-primary/20 text-primary border-primary/30';

  const scheduledDate = new Date(session.scheduled_at);
  const isUpcoming = scheduledDate > new Date();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.3 }}
      className="bg-card/40 backdrop-blur-sm border border-white/10 rounded-2xl overflow-hidden shadow-xl shadow-black/5 mb-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <motion.div whileHover={{ scale: 1.05 }}>
            <Avatar className="h-11 w-11 ring-2 ring-primary/30 shadow-lg">
              <AvatarImage src={session.organizer.avatar_url} />
              <AvatarFallback className="bg-primary/20 text-primary font-semibold">
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

        {/* Activity Badge */}
        <Badge 
          variant="outline" 
          className={`${activityColor} rounded-full px-3 py-1 text-xs font-medium border`}
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

        {/* Info Grid */}
        <div className="grid grid-cols-2 gap-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-white/5 rounded-lg px-3 py-2">
            <MapPin className="h-4 w-4 text-primary/70" />
            <span className="truncate">{session.location_name}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-white/5 rounded-lg px-3 py-2">
            <Users className="h-4 w-4 text-primary/70" />
            <span>
              {session.current_participants}
              {session.max_participants && `/${session.max_participants}`}
            </span>
          </div>
        </div>

        {/* Date/Time Banner */}
        <div className={`flex items-center gap-3 rounded-xl px-4 py-3 ${
          isUpcoming 
            ? 'bg-gradient-to-r from-primary/20 to-primary/10 border border-primary/20' 
            : 'bg-white/5 border border-white/10'
        }`}>
          <div className="flex items-center justify-center h-10 w-10 rounded-full bg-background/50">
            <Calendar className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="font-medium text-sm">
              {format(scheduledDate, "EEEE d MMMM", { locale: fr })}
            </p>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>{format(scheduledDate, "HH'h'mm", { locale: fr })}</span>
              {isUpcoming && (
                <Badge variant="secondary" className="ml-2 text-[10px] px-1.5 py-0 bg-primary/20 text-primary">
                  À venir
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Mini Map */}
        <div className="w-full h-36 rounded-xl overflow-hidden border border-white/10">
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
