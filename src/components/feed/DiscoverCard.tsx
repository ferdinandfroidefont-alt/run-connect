import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ProfilePreviewDialog } from '@/components/ProfilePreviewDialog';
import { ShareSessionToConversationDialog } from '@/components/ShareSessionToConversationDialog';
import { SessionLevelBadge } from '@/components/SessionLevelBadge';
import { ActivityIcon } from '@/lib/activityIcons';
import { MapPin, Calendar, Users, UserPlus, Share2 } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { DiscoverSession, ACTIVITY_TYPES } from '@/hooks/useDiscoverFeed';
import type { SessionLevel } from '@/lib/sessionLevelCalculator';

interface DiscoverCardProps {
  session: DiscoverSession;
  onJoin: (session: DiscoverSession) => void;
  index?: number;
}

export const DiscoverCard = ({ session, onJoin, index = 0 }: DiscoverCardProps) => {
  const [selectedProfile, setSelectedProfile] = useState<string | null>(null);
  const [showShareDialog, setShowShareDialog] = useState(false);

  const getIntensityColor = (intensity: string | null) => {
    switch (intensity?.toLowerCase()) {
      case 'faible': return 'bg-green-100 text-green-800';
      case 'modere': case 'modérée': return 'bg-yellow-100 text-yellow-800';
      case 'elevee': case 'élevée': return 'bg-red-100 text-red-800';
      default: return 'bg-secondary text-muted-foreground';
    }
  };

  const getActivityPastel = (activityType: string) => {
    switch (activityType) {
      case 'running': return 'ios-pastel-orange';
      case 'trail': return 'ios-pastel-green';
      case 'cycling': return 'ios-pastel-blue';
      case 'mtb': return 'ios-pastel-indigo';
      case 'walking': return 'ios-pastel-yellow';
      case 'football': return 'ios-pastel-green';
      case 'basketball': return 'ios-pastel-orange';
      case 'swimming': return 'ios-pastel-cyan';
      case 'tennis': return 'ios-pastel-purple';
      case 'petanque': return 'ios-pastel-pink';
      default: return 'ios-pastel-blue';
    }
  };

  return (
    <>
      <div 
        className={cn("rounded-[14px] overflow-hidden border-0 animate-fade-in", getActivityPastel(session.activity_type))}
        style={{ animationDelay: `${index * 80}ms`, animationFillMode: 'both' }}
      >
        <div className="p-4 space-y-3">
          {/* Header */}
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-3">
              <Avatar 
                className="h-10 w-10 cursor-pointer"
                onClick={() => setSelectedProfile(session.organizer_id)}
              >
                <AvatarImage src={session.organizer.avatar_url || ""} />
                <AvatarFallback className="bg-secondary text-[15px]">
                  {(session.organizer.username || session.organizer.display_name)?.charAt(0)?.toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-semibold text-[17px]">{session.title}</h3>
                <p 
                  className="text-[13px] text-muted-foreground cursor-pointer"
                  onClick={() => setSelectedProfile(session.organizer_id)}
                >
                  par {session.organizer.username || session.organizer.display_name}
                </p>
              </div>
            </div>
            <span className="text-[13px] font-medium text-primary">
              {session.distance_km.toFixed(1)} km
            </span>
          </div>

          {/* Badges */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Level Badge */}
            <SessionLevelBadge 
              level={(session.calculated_level || 3) as SessionLevel} 
              variant="compact"
              size="sm"
            />
            <Badge variant="outline" className="text-[11px] rounded-full flex items-center gap-1.5">
              <ActivityIcon activityType={session.activity_type} size="sm" />
              {ACTIVITY_TYPES.find(a => a.value === session.activity_type)?.label || session.activity_type}
            </Badge>
            {session.intensity && (
              <Badge className={cn("text-[11px] rounded-full", getIntensityColor(session.intensity))}>
                {session.intensity}
              </Badge>
            )}
            {session.friends_only && (
              <Badge variant="secondary" className="text-[11px] rounded-full">
                Amis uniquement
              </Badge>
            )}
          </div>

          {/* Details */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>
                {format(new Date(session.scheduled_at), 'dd MMMM à HH:mm', { locale: fr })}
              </span>
            </div>

            <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span className="truncate">{session.location_name}</span>
            </div>

            <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
              <Users className="h-4 w-4" />
              <span>
                {session.current_participants}
                {session.max_participants && `/${session.max_participants}`} participants
              </span>
            </div>

            {session.description && (
              <p className="text-[13px] text-muted-foreground line-clamp-2 pt-1">
                {session.description}
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-foreground/5 flex gap-2">
            <Button
              onClick={() => onJoin(session)}
              size="sm"
              className="flex-1 h-10 rounded-full ios-gradient-btn text-white shadow-lg shadow-primary/25 border-0"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              {session.friends_only ? "Demander" : "Rejoindre"}
            </Button>
            <Button
              onClick={() => setShowShareDialog(true)}
              size="sm"
              variant="ghost"
              className="h-10 w-10 p-0 rounded-full bg-foreground/5 active:bg-foreground/10"
            >
              <Share2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <ProfilePreviewDialog 
        userId={selectedProfile} 
        onClose={() => setSelectedProfile(null)} 
      />

      <ShareSessionToConversationDialog
        isOpen={showShareDialog}
        onClose={() => setShowShareDialog(false)}
        session={{
          id: session.id,
          title: session.title,
          description: session.description || '',
          activity_type: session.activity_type,
          location_name: session.location_name,
          scheduled_at: session.scheduled_at,
          organizer_id: session.organizer_id,
          profiles: {
            username: session.organizer.username,
            display_name: session.organizer.display_name,
            avatar_url: session.organizer.avatar_url || undefined
          }
        }}
        onSessionShared={() => setShowShareDialog(false)}
      />
    </>
  );
};