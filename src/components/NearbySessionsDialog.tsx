import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ProfilePreviewDialog } from "@/components/ProfilePreviewDialog";
import { ShareSessionToConversationDialog } from "@/components/ShareSessionToConversationDialog";
import { ActivityIcon } from "@/lib/activityIcons";
import { useToast } from "@/hooks/use-toast";
import { MapPin, Calendar, Users, UserPlus, Share2, ChevronLeft, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";

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
  is_private: boolean;
  friends_only: boolean;
  profiles?: {
    username: string;
    display_name: string;
    avatar_url: string | null;
  } | null;
}

interface NearbySessionsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  userLocation?: { lat: number; lng: number };
}

const ACTIVITY_TYPES = [
  { value: "course", label: "Course" },
  { value: "trail", label: "Trail" },
  { value: "velo", label: "Vélo" },
  { value: "vtt", label: "VTT" },
  { value: "bmx", label: "BMX" },
  { value: "gravel", label: "Gravel" },
  { value: "marche", label: "Marche" },
  { value: "natation", label: "Natation" },
  { value: "football", label: "Football" },
  { value: "basket", label: "Basketball" },
  { value: "volley", label: "Volleyball" },
  { value: "badminton", label: "Badminton" },
  { value: "pingpong", label: "Ping-pong" },
  { value: "tennis", label: "Tennis" },
  { value: "escalade", label: "Escalade" },
  { value: "petanque", label: "Pétanque" },
  { value: "rugby", label: "Rugby" },
  { value: "handball", label: "Handball" },
  { value: "fitness", label: "Fitness" },
  { value: "yoga", label: "Yoga" },
  { value: "musculation", label: "Musculation" },
  { value: "crossfit", label: "CrossFit" },
  { value: "boxe", label: "Boxe" },
  { value: "arts_martiaux", label: "Arts martiaux" },
  { value: "golf", label: "Golf" },
  { value: "ski", label: "Ski" },
  { value: "snowboard", label: "Snowboard" },
  { value: "randonnee", label: "Randonnée" },
  { value: "kayak", label: "Kayak" },
  { value: "surf", label: "Surf" }
];

export const NearbySessionsDialog = ({ isOpen, onClose, userLocation }: NearbySessionsDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDistance, setSelectedDistance] = useState("10");
  const [selectedActivities, setSelectedActivities] = useState<string[]>(
    ACTIVITY_TYPES.map(a => a.value)
  );
  const [selectedProfile, setSelectedProfile] = useState<string | null>(null);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [selectedSessionToShare, setSelectedSessionToShare] = useState<Session | null>(null);
  
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const loadNearbySessions = async () => {
    if (!user || !userLocation) return;

    try {
      setLoading(true);
      
      const { data: sessionsData, error } = await supabase
        .from('sessions')
        .select('*')
        .gte('scheduled_at', new Date().toISOString())
        .neq('organizer_id', user.id)
        .eq('is_private', false)
        .order('scheduled_at', { ascending: true });

      if (error) throw error;

      const organizerIds = [...new Set(sessionsData?.map(s => s.organizer_id) || [])];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('user_id, username, display_name, avatar_url')
        .in('user_id', organizerIds);

      const sessionsWithProfiles = (sessionsData || []).map(session => ({
        ...session,
        profiles: profilesData?.find(p => p.user_id === session.organizer_id) || null
      }));

      const filteredSessions = sessionsWithProfiles.filter(session => {
        const distanceInKm = calculateDistance(
          userLocation.lat,
          userLocation.lng,
          session.location_lat,
          session.location_lng
        );
        
        if (distanceInKm > parseInt(selectedDistance)) return false;

        if (selectedActivities.length > 0 && !selectedActivities.includes(session.activity_type)) {
          return false;
        }

        return true;
      });

      setSessions(filteredSessions as Session[]);
    } catch (error: any) {
      console.error('Error loading nearby sessions:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les séances à proximité",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const joinSession = async (session: Session) => {
    if (!user) return;

    try {
      if (session.friends_only) {
        const { error: requestError } = await supabase
          .from('session_requests')
          .insert([{
            session_id: session.id,
            user_id: user.id,
            requester_name: user.user_metadata?.display_name || user.email?.split('@')[0] || 'Utilisateur',
            requester_avatar: user.user_metadata?.avatar_url || null
          }]);

        if (requestError) throw requestError;

        toast({
          title: "Demande envoyée",
          description: "Votre demande de participation a été envoyée à l'organisateur"
        });
      } else {
        const { error } = await supabase
          .from('session_participants')
          .insert([{
            session_id: session.id,
            user_id: user.id
          }]);

        if (error) throw error;

        await supabase
          .from('sessions')
          .update({ 
            current_participants: session.current_participants + 1 
          })
          .eq('id', session.id);

        toast({
          title: "Succès",
          description: "Vous avez rejoint la séance !"
        });

        loadNearbySessions();
      }
    } catch (error: any) {
      console.error('Error joining session:', error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de rejoindre la séance",
        variant: "destructive"
      });
    }
  };

  const getIntensityColor = (intensity: string) => {
    switch (intensity?.toLowerCase()) {
      case 'faible': return 'bg-green-100 text-green-800';
      case 'modere': case 'modérée': return 'bg-yellow-100 text-yellow-800';
      case 'elevee': case 'élevée': return 'bg-red-100 text-red-800';
      default: return 'bg-secondary text-muted-foreground';
    }
  };

  const getDistanceToSession = (session: Session): string => {
    if (!userLocation) return '';
    const distanceInKm = calculateDistance(
      userLocation.lat,
      userLocation.lng,
      session.location_lat,
      session.location_lng
    );
    return `${distanceInKm.toFixed(1)} km`;
  };

  const toggleActivity = (activityValue: string) => {
    setSelectedActivities(prev => 
      prev.includes(activityValue)
        ? prev.filter(a => a !== activityValue)
        : [...prev, activityValue]
    );
  };

  const toggleAllActivities = () => {
    if (selectedActivities.length === ACTIVITY_TYPES.length) {
      setSelectedActivities([]);
    } else {
      setSelectedActivities(ACTIVITY_TYPES.map(a => a.value));
    }
  };

  const resetFilters = () => {
    setSelectedActivities(ACTIVITY_TYPES.map(a => a.value));
    setSelectedDistance("10");
  };

  useEffect(() => {
    if (isOpen) {
      loadNearbySessions();
    }
  }, [isOpen, selectedDistance, selectedActivities, userLocation]);

  return (
    <>
      <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent 
          side="bottom" 
          className="w-full h-full p-0 flex flex-col bg-secondary rounded-none sm:rounded-t-[10px] sm:h-[95vh]"
        >
          {/* iOS Header */}
          <div className="bg-card border-b border-border shrink-0 sm:rounded-t-[10px]">
            <div className="flex items-center justify-between px-4 py-3">
              <button
                onClick={onClose}
                className="flex items-center gap-1 text-primary"
              >
                <ChevronLeft className="h-5 w-5" />
                <span className="text-[17px]">Retour</span>
              </button>
              <h1 className="text-[17px] font-semibold text-foreground">Séances proches</h1>
              <div className="w-16" />
            </div>
          </div>

          {/* Activity Filter Pills - iOS Style */}
          <div className="bg-card border-b border-border px-4 py-3">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[13px] font-medium text-muted-foreground uppercase tracking-wide">
                Sports
              </span>
              <button 
                onClick={toggleAllActivities}
                className="text-[13px] font-medium text-primary"
              >
                {selectedActivities.length === ACTIVITY_TYPES.length 
                  ? "Désélectionner tout" 
                  : "Tout sélectionner"}
              </button>
            </div>
            
            <div 
              ref={scrollContainerRef}
              className="overflow-x-auto scrollbar-hide -mx-4 px-4"
            >
              <div className="flex gap-2 pb-1">
                {ACTIVITY_TYPES.map(activity => (
                  <button
                    key={activity.value}
                    onClick={() => toggleActivity(activity.value)}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-full border text-[13px] font-medium whitespace-nowrap transition-colors",
                      selectedActivities.includes(activity.value)
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-card text-muted-foreground border-border"
                    )}
                  >
                    <ActivityIcon activityType={activity.value} size="sm" />
                    <span>{activity.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Distance Filter - iOS Style */}
          <div className="bg-card border-b border-border px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="text-[15px] font-medium">Distance max</span>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={selectedDistance}
                  onChange={(e) => setSelectedDistance(e.target.value)}
                  className="w-16 h-9 text-[15px] text-right bg-secondary border-border rounded-[8px]"
                  min="1"
                  max="100"
                />
                <span className="text-[15px] text-muted-foreground">km</span>
              </div>
            </div>
          </div>

          {/* Content */}
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-3">
              {loading ? (
                <div className="bg-card border border-border rounded-[10px] p-8 flex flex-col items-center justify-center gap-3">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-[15px] text-muted-foreground">Recherche...</p>
                </div>
              ) : sessions.length === 0 ? (
                <div className="bg-card border border-border rounded-[10px] p-8 text-center">
                  <div className="h-16 w-16 mx-auto mb-4 rounded-full bg-secondary flex items-center justify-center">
                    <MapPin className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <p className="text-[17px] font-semibold text-foreground mb-1">
                    Aucune séance trouvée
                  </p>
                  <p className="text-[13px] text-muted-foreground mb-4">
                    Élargis la distance ou active d'autres sports
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={resetFilters}
                    className="rounded-full"
                  >
                    Réinitialiser les filtres
                  </Button>
                </div>
              ) : (
                sessions.map((session) => (
                  <div 
                    key={session.id} 
                    className="bg-card border border-border rounded-[10px] overflow-hidden"
                  >
                    <div className="p-4 space-y-3">
                      {/* Header */}
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-3">
                          <Avatar 
                            className="h-10 w-10 cursor-pointer"
                            onClick={() => setSelectedProfile(session.organizer_id)}
                          >
                            <AvatarImage src={session.profiles?.avatar_url || ""} />
                            <AvatarFallback className="bg-secondary text-[15px]">
                              {(session.profiles?.username || session.profiles?.display_name)?.charAt(0)?.toUpperCase() || "U"}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <h3 className="font-semibold text-[17px]">{session.title}</h3>
                            <p 
                              className="text-[13px] text-muted-foreground cursor-pointer"
                              onClick={() => setSelectedProfile(session.organizer_id)}
                            >
                              par {session.profiles?.username || session.profiles?.display_name}
                            </p>
                          </div>
                        </div>
                        <span className="text-[13px] font-medium text-primary">
                          {getDistanceToSession(session)}
                        </span>
                      </div>

                      {/* Badges */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="text-[11px] rounded-full">
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

                      {/* Action Buttons - iOS Style */}
                      <div className="pt-3 border-t border-border flex gap-2">
                        <Button
                          onClick={() => joinSession(session)}
                          size="sm"
                          className="flex-1 h-10 rounded-[8px]"
                        >
                          <UserPlus className="h-4 w-4 mr-2" />
                          {session.friends_only ? "Demander" : "Rejoindre"}
                        </Button>
                        <Button
                          onClick={() => {
                            setSelectedSessionToShare(session);
                            setShowShareDialog(true);
                          }}
                          size="sm"
                          variant="outline"
                          className="h-10 w-10 p-0 rounded-[8px]"
                        >
                          <Share2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      <ProfilePreviewDialog 
        userId={selectedProfile} 
        onClose={() => setSelectedProfile(null)} 
      />

      <ShareSessionToConversationDialog
        isOpen={showShareDialog}
        onClose={() => {
          setShowShareDialog(false);
          setSelectedSessionToShare(null);
        }}
        session={selectedSessionToShare}
        onSessionShared={() => {
          setShowShareDialog(false);
          setSelectedSessionToShare(null);
        }}
      />
    </>
  );
};
