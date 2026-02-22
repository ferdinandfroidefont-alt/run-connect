import { useState } from 'react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { FeedActions } from './FeedActions';
import { FeedComments } from './FeedComments';
import { MiniMapPreview } from './MiniMapPreview';
import { SessionLevelBadge } from '@/components/SessionLevelBadge';
import { formatDistanceToNow, format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Calendar, MapPin, Users, Clock } from 'lucide-react';
import { Share } from '@capacitor/share';
import { toast } from 'sonner';
import type { FeedSession } from '@/hooks/useFeed';
import type { SessionLevel } from '@/lib/sessionLevelCalculator';

interface FeedCardProps {
  session: FeedSession;
  onLike: (sessionId: string) => void;
  onUnlike: (sessionId: string) => void;
  onAddComment: (sessionId: string, content: string) => void;
  onJoinSession: (sessionId: string) => void;
  index?: number;
}

const activityLabels: Record<string, string> = {
  'running': 'Course',
  'trail': 'Trail',
  'cycling': 'Vélo',
  'mtb': 'VTT',
  'walking': 'Marche',
  'football': 'Football',
  'basketball': 'Basketball',
  'swimming': 'Natation',
  'tennis': 'Tennis',
  'petanque': 'Pétanque'
};

const activityPastelMap: Record<string, string> = {
  'running': 'ios-pastel-orange',
  'trail': 'ios-pastel-green',
  'cycling': 'ios-pastel-blue',
  'mtb': 'ios-pastel-indigo',
  'walking': 'ios-pastel-yellow',
  'football': 'ios-pastel-green',
  'basketball': 'ios-pastel-orange',
  'swimming': 'ios-pastel-cyan',
  'tennis': 'ios-pastel-purple',
  'petanque': 'ios-pastel-pink',
};

export const FeedCard = ({
  session,
  onLike,
  onUnlike,
  onAddComment,
  onJoinSession,
  index = 0
}: FeedCardProps) => {
  const [showComments, setShowComments] = useState(false);
  
  const handleLike = () => {
    if (session.is_liked) {
      onUnlike(session.id);
    } else {
      onLike(session.id);
    }
  };

  const handleShare = async () => {
    const shareUrl = `https://run-connect.lovable.app/?session=${session.id}`;
    const shareText = `🏃 ${session.title} - ${activityLabels[session.activity_type] || session.activity_type}\n📍 ${session.location_name}\n📅 ${format(new Date(session.scheduled_at), "EEEE d MMMM 'à' HH'h'mm", { locale: fr })}`;
    const fullText = `${shareText}\n\n${shareUrl}`;
    
    // Try AndroidBridge first (native WebView)
    if ((window as any).AndroidBridge?.shareText) {
      (window as any).AndroidBridge.shareText(fullText);
      return;
    }
    
    // Try Capacitor Share
    try {
      const { Share } = await import('@capacitor/share');
      await Share.share({
        title: session.title,
        text: shareText,
        url: shareUrl,
        dialogTitle: 'Partager cette séance'
      });
      return;
    } catch (error) {
      console.log('Capacitor share failed, trying Web Share API');
    }
    
    // Fallback to Web Share API
    if (navigator.share) {
      try {
        await navigator.share({
          title: session.title,
          text: shareText,
          url: shareUrl
        });
        return;
      } catch {
        // User cancelled or error
      }
    }
    
    // Final fallback: copy to clipboard
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success('Lien copié !');
    } catch {
      toast.error('Impossible de copier le lien');
    }
  };

  const scheduledDate = new Date(session.scheduled_at);
  const isUpcoming = scheduledDate > new Date();
  const activityLabel = activityLabels[session.activity_type] || session.activity_type;

  return (
    <div 
      className="mb-px overflow-hidden bg-card animate-fade-in"
      style={{ animationDelay: `${index * 80}ms`, animationFillMode: 'both' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={session.organizer.avatar_url} />
            <AvatarFallback className="bg-secondary text-[15px] font-medium">
              {session.organizer.username[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-semibold text-[15px]">@{session.organizer.username}</p>
            <p className="text-[13px] text-muted-foreground">
              {formatDistanceToNow(new Date(session.created_at), {
                addSuffix: true,
                locale: fr
              })}
            </p>
          </div>
        </div>

        {/* Activity Badge & Level */}
        <div className="flex items-center gap-2">
          <SessionLevelBadge 
            level={(session.calculated_level || 3) as SessionLevel} 
            variant="compact"
            size="sm"
          />
          <span className="text-[13px] font-medium text-primary bg-primary/10 px-3 py-1 rounded-full">
            {activityLabel}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 pb-3 space-y-3">
        {/* Title */}
        <h3 className="font-semibold text-[17px] leading-tight">{session.title}</h3>

        {/* Description */}
        {session.description && (
          <p className="text-[15px] text-muted-foreground line-clamp-2">
            {session.description}
          </p>
        )}

        {/* Info Row */}
        <div className="flex items-center gap-4 text-[13px] text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <MapPin className="h-4 w-4" />
            <span className="truncate max-w-[120px]">{session.location_name}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Users className="h-4 w-4" />
            <span>
              {session.current_participants}
              {session.max_participants && `/${session.max_participants}`}
            </span>
          </div>
        </div>

        {/* Date/Time */}
        <div className={`flex items-center gap-3 rounded-[10px] px-3 py-2.5 ${
          isUpcoming ? 'bg-primary/5' : 'bg-secondary'
        }`}>
          <Calendar className="h-5 w-5 text-primary" />
          <div className="flex-1">
            <p className="font-medium text-[15px]">
              {format(scheduledDate, "EEEE d MMMM", { locale: fr })}
            </p>
            <div className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              <span>{format(scheduledDate, "HH'h'mm", { locale: fr })}</span>
              {isUpcoming && (
                <span className="ml-2 text-[11px] font-medium text-primary">À venir</span>
              )}
            </div>
          </div>
        </div>

        {/* Mini Map */}
        <div className="w-full h-32 rounded-[12px] overflow-hidden">
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
        onComment={() => setShowComments(!showComments)}
        onJoin={() => onJoinSession(session.id)}
        onShare={handleShare}
      />

      {/* Comments - Toggle visibility */}
      {(showComments || session.latest_comments.length > 0) && (
        <FeedComments
          comments={session.latest_comments}
          totalComments={session.comments_count}
          onAddComment={(content) => onAddComment(session.id, content)}
          onViewAll={() => setShowComments(true)}
        />
      )}
    </div>
  );
};