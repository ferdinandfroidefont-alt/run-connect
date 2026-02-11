import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { MapPin, Clock, Users, ChevronRight } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import { getActivityConfig } from "@/lib/activityIcons";
import { SessionLevelBadge } from "./SessionLevelBadge";
import type { SessionLevel } from "@/lib/sessionLevelCalculator";

interface Session {
  id: string;
  title: string;
  description: string;
  activity_type: string;
  session_type: string;
  intensity: string;
  location_lat: number;
  location_lng: number;
  location_name: string;
  scheduled_at: string;
  max_participants: number;
  current_participants: number;
  organizer_id: string;
  club_id?: string | null;
  image_url?: string;
  calculated_level?: number;
  profiles: {
    username: string;
    display_name: string;
    avatar_url: string | null;
  };
  routes?: {
    id: string;
    name: string;
    coordinates: any[];
    total_distance: number;
    total_elevation_gain: number;
  } | null;
}

interface SessionPreviewPopupProps {
  session: Session | null;
  onClose: () => void;
  onViewDetails: () => void;
  isImminent?: boolean;
}

const getActivityColor = (activityType: string) => {
  const colors: Record<string, string> = {
    'course': 'bg-red-500',
    'trail': 'bg-orange-500',
    'velo': 'bg-blue-500',
    'vtt': 'bg-emerald-600',
    'marche': 'bg-green-500',
    'natation': 'bg-teal-500'
  };
  return colors[activityType] || colors['course'];
};

const getIntensityLabel = (intensity: string) => {
  const labels: Record<string, string> = {
    'easy': 'Facile',
    'moderate': 'Modéré',
    'hard': 'Intense'
  };
  return labels[intensity] || intensity;
};

export const SessionPreviewPopup = ({
  session,
  onClose,
  onViewDetails,
  isImminent = false
}: SessionPreviewPopupProps) => {
  if (!session) return null;

  const sessionDate = new Date(session.scheduled_at);
  const now = new Date();
  const diffMs = sessionDate.getTime() - now.getTime();
  const diffMinutes = Math.round(diffMs / 60000);
  
  // Calculate time display
  const getTimeDisplay = () => {
    if (diffMinutes < 0) return "Terminée";
    if (diffMinutes < 60) return `Dans ${diffMinutes} min`;
    if (diffMinutes < 120) return `Dans ${Math.round(diffMinutes / 60)}h`;
    return format(sessionDate, "HH:mm", { locale: fr });
  };

  const activityConfig = getActivityConfig(session.activity_type);

  return (
    <AnimatePresence>
      {session && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40"
            onClick={onClose}
          />
          
          {/* Popup */}
          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-20 left-4 right-4 z-50"
          >
            <div 
              className={`bg-card rounded-2xl shadow-2xl border border-border overflow-hidden ${
                isImminent ? 'ring-2 ring-orange-500 ring-offset-2 ring-offset-background' : ''
              }`}
            >
              {/* Imminent badge */}
              {isImminent && diffMinutes > 0 && (
                <div className="bg-gradient-to-r from-orange-500 to-red-500 px-3 py-1.5 flex items-center justify-center gap-2">
                  <span className="animate-pulse w-2 h-2 bg-white rounded-full" />
                  <span className="text-white text-xs font-semibold">
                    Commence bientôt • {getTimeDisplay()}
                  </span>
                </div>
              )}
              
              <div className="p-4">
                {/* Header with organizer */}
                <div className="flex items-start gap-3">
                  <Avatar className="w-12 h-12 ring-2 ring-primary/20">
                    <AvatarImage 
                      src={session.profiles.avatar_url || undefined} 
                      alt={session.profiles.display_name} 
                    />
                    <AvatarFallback className="bg-muted">
                      {(session.profiles.display_name || 'U').charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground truncate text-base">
                      {session.title}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      par {session.profiles.display_name || session.profiles.username}
                    </p>
                  </div>
                  
                  {/* Activity badge */}
                  <div className="rounded-xl overflow-hidden">
                    <img src={activityConfig.image} alt={activityConfig.label} className="h-9 w-9 object-cover" />
                  </div>
                </div>
                
                {/* Info row */}
                <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
                  {/* Time */}
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-4 w-4" />
                    <span className={isImminent ? 'text-orange-500 font-medium' : ''}>
                      {!isImminent ? format(sessionDate, "HH:mm", { locale: fr }) : getTimeDisplay()}
                    </span>
                  </div>
                  
                  {/* Location */}
                  <div className="flex items-center gap-1.5 flex-1 min-w-0">
                    <MapPin className="h-4 w-4 shrink-0" />
                    <span className="truncate">{session.location_name}</span>
                  </div>
                  
                  {/* Participants */}
                  <div className="flex items-center gap-1.5">
                    <Users className="h-4 w-4" />
                    <span>
                      {session.current_participants || 0}/{session.max_participants}
                    </span>
                  </div>
                </div>
                
                {/* Tags row */}
                <div className="flex items-center gap-2 mt-3">
                  {/* Level Badge */}
                  <SessionLevelBadge 
                    level={(session.calculated_level || 3) as SessionLevel} 
                    variant="compact"
                    size="sm"
                  />
                  <Badge variant="secondary" className="text-xs">
                    {getIntensityLabel(session.intensity)}
                  </Badge>
                  {session.routes && (
                    <Badge variant="outline" className="text-xs">
                      📍 {session.routes.total_distance} km
                    </Badge>
                  )}
                </div>
                
                {/* Action button */}
                <Button 
                  onClick={onViewDetails}
                  className="w-full mt-4 gap-2"
                  size="lg"
                >
                  Voir les détails
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
