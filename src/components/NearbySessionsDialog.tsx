import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ProfilePreviewDialog } from "@/components/ProfilePreviewDialog";
import { ShareSessionToConversationDialog } from "@/components/ShareSessionToConversationDialog";
import { useToast } from "@/hooks/use-toast";
import { MapPin, Calendar, Users, UserPlus, Share2 } from "lucide-react";
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
  { value: "course", label: "Course", emoji: "🏃‍♂️" },
  { value: "trail", label: "Trail", emoji: "🏃‍♂️" },
  { value: "velo", label: "Vélo", emoji: "🚴" },
  { value: "vtt", label: "VTT", emoji: "🚵" },
  { value: "natation", label: "Natation", emoji: "🏊" },
  { value: "randonnee", label: "Randonnée", emoji: "🏔️" },
  { value: "fitness", label: "Fitness", emoji: "🏋️" },
  { value: "yoga", label: "Yoga", emoji: "🧘" },
  { value: "football", label: "Football", emoji: "⚽" },
  { value: "basketball", label: "Basketball", emoji: "🏀" },
  { value: "tennis", label: "Tennis", emoji: "🎾" },
  { value: "ski", label: "Ski", emoji: "⛷️" },
  { value: "escalade", label: "Escalade", emoji: "🧗" },
  { value: "autre", label: "Autre", emoji: "🏅" }
];

export const NearbySessionsDialog = ({ isOpen, onClose, userLocation }: NearbySessionsDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDistance, setSelectedDistance] = useState("1000");
  const [selectedActivities, setSelectedActivities] = useState<string[]>(
    ACTIVITY_TYPES.map(a => a.value) // Tous activés par défaut
  );
  const [selectedProfile, setSelectedProfile] = useState<string | null>(null);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [selectedSessionToShare, setSelectedSessionToShare] = useState<Session | null>(null);

  // Load nearby sessions
  const loadNearbySessions = async () => {
    if (!user || !userLocation) return;

    try {
      setLoading(true);
      
      // Get all sessions without profiles first
      const { data: sessionsData, error } = await supabase
        .from('sessions')
        .select('*')
        .gte('scheduled_at', new Date().toISOString())
        .neq('organizer_id', user.id)
        .eq('is_private', false)
        .order('scheduled_at', { ascending: true });

      if (error) throw error;

      // Get organizer profiles
      const organizerIds = [...new Set(sessionsData?.map(s => s.organizer_id) || [])];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('user_id, username, display_name, avatar_url')
        .in('user_id', organizerIds);

      // Map profiles to sessions
      const sessionsWithProfiles = (sessionsData || []).map(session => ({
        ...session,
        profiles: profilesData?.find(p => p.user_id === session.organizer_id) || null
      }));

      // Filter by distance and activity
      const filteredSessions = sessionsWithProfiles.filter(session => {
        // Distance filter
        const distanceInKm = calculateDistance(
          userLocation.lat,
          userLocation.lng,
          session.location_lat,
          session.location_lng
        );
        
        // Distance filter in km
        if (distanceInKm > parseInt(selectedDistance)) return false;

        // Activity filter (multi-selection)
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

  // Calculate distance between two points (Haversine formula)
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Radius of the Earth in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // Join a session
  const joinSession = async (session: Session) => {
    if (!user) return;

    try {
      // Check if session is private or friends-only and create request
      if (session.friends_only) {
        // Create a session request for friends-only sessions
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
        // Join directly for public sessions
        const { error } = await supabase
          .from('session_participants')
          .insert([{
            session_id: session.id,
            user_id: user.id
          }]);

        if (error) throw error;

        // Update session participant count
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

        // Refresh sessions
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
      default: return 'bg-gray-100 text-gray-800';
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
    setSelectedDistance("5000");
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
          side="top" 
          className="w-full h-full min-h-screen p-0 border-0 max-w-none backdrop-blur-xl bg-background/95 border-border/50"
        >
          {/* Petite barre en haut */}
          <div className="w-full h-6 bg-background"></div>
          
          {/* Sticky Header avec filtres */}
          <div className="sticky top-0 z-10 backdrop-blur-xl bg-background/95 border-b border-border/50 px-6 pb-4">
            <SheetHeader className="mb-4">
              <div className="flex items-center justify-between">
                <SheetTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Séances proches de moi
                </SheetTitle>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={toggleAllActivities}
                  className="text-xs text-primary hover:underline"
                >
                  {selectedActivities.length === ACTIVITY_TYPES.length 
                    ? "Tout désactiver" 
                    : "Tout sélectionner"}
                </Button>
              </div>
            </SheetHeader>

            {/* Sports Section */}
            <div className="rounded-xl border border-border/50 bg-card/30 backdrop-blur-sm shadow-sm p-4 space-y-3 animate-fade-in">
              <h3 className="text-sm font-semibold">Sports</h3>
              
              <ScrollArea className="w-full">
                <div className="flex gap-2 pb-2 w-max">
                  {ACTIVITY_TYPES.map(activity => (
                    <button
                      key={activity.value}
                      onClick={() => toggleActivity(activity.value)}
                      className={cn(
                        "flex items-center gap-2 px-4 py-2.5 rounded-full border transition-all duration-200 min-w-[120px]",
                        "hover:shadow-md hover:scale-105 active:scale-95",
                        selectedActivities.includes(activity.value)
                          ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/25"
                          : "bg-muted/50 text-muted-foreground border-border/50 opacity-60"
                      )}
                    >
                      <span className="text-lg">{activity.emoji}</span>
                      <span className="text-sm font-medium whitespace-nowrap">{activity.label}</span>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </div>

            {/* Distance Filter */}
            <div className="rounded-xl border border-border/50 bg-card/30 backdrop-blur-sm shadow-sm p-4 mt-3 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Distance maximale
                </label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={selectedDistance}
                    onChange={(e) => setSelectedDistance(e.target.value)}
                    className="w-24 text-right"
                    min="100"
                    max="50000"
                  />
                  <span className="text-sm text-muted-foreground">km</span>
                </div>
              </div>
              
              <Button 
                onClick={loadNearbySessions}
                className="w-full rounded-full bg-primary hover:bg-primary/90 transition-all shadow-md"
              >
                Appliquer les filtres
              </Button>
            </div>
          </div>

          {/* Sessions List */}
          <ScrollArea className="flex-1 px-6">
            <div className="space-y-3 py-4">
              {loading ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Recherche des séances...</p>
                </div>
              ) : sessions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 space-y-3 animate-fade-in">
                  <div className="text-6xl animate-bounce">🏃‍♂️💨</div>
                  <p className="text-lg font-semibold">Aucune séance trouvée</p>
                  <p className="text-sm text-muted-foreground text-center max-w-xs">
                    Essaye d'élargir la distance ou d'activer d'autres sports.
                  </p>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={resetFilters}
                    className="mt-4"
                  >
                    Réinitialiser les filtres
                  </Button>
                </div>
              ) : (
                sessions.map((session) => (
                  <Card key={session.id} className="transition-all duration-200 hover:shadow-lg hover:scale-[1.01] animate-fade-in border-border/50 bg-card/30 backdrop-blur-sm">
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        {/* Header */}
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-3">
                            <Avatar 
                              className="h-8 w-8 cursor-pointer hover:ring-2 hover:ring-primary/20 transition-all"
                              onClick={() => setSelectedProfile(session.organizer_id)}
                            >
                              <AvatarImage src={session.profiles?.avatar_url || ""} />
                              <AvatarFallback className="text-xs">
                                {(session.profiles?.username || session.profiles?.display_name)?.charAt(0)?.toUpperCase() || "U"}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <h3 className="font-semibold">{session.title}</h3>
                              <p 
                                className="text-sm text-muted-foreground cursor-pointer hover:text-primary transition-colors"
                                onClick={() => setSelectedProfile(session.organizer_id)}
                              >
                                par {session.profiles?.username || session.profiles?.display_name}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-medium text-primary">
                              {getDistanceToSession(session)}
                            </div>
                          </div>
                        </div>

                        {/* Badges */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className="text-xs">
                            {ACTIVITY_TYPES.find(a => a.value === session.activity_type)?.label || session.activity_type}
                          </Badge>
                          {session.intensity && (
                            <Badge className={`text-xs ${getIntensityColor(session.intensity)}`}>
                              {session.intensity}
                            </Badge>
                          )}
                          {session.friends_only && (
                            <Badge variant="secondary" className="text-xs">
                              Amis uniquement
                            </Badge>
                          )}
                        </div>

                        {/* Details */}
                        <div className="space-y-2">
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            <span>
                              {format(new Date(session.scheduled_at), 'dd MMMM yyyy à HH:mm', { locale: fr })}
                            </span>
                          </div>

                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            <span>{session.location_name}</span>
                          </div>

                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Users className="h-3 w-3" />
                            <span>
                              {session.current_participants}
                              {session.max_participants && `/${session.max_participants}`} participants
                            </span>
                          </div>

                          {session.description && (
                            <p className="text-xs text-muted-foreground line-clamp-2">
                              {session.description}
                            </p>
                          )}
                        </div>

                        {/* Action Buttons */}
                        <div className="pt-2 border-t flex gap-2">
                          <Button
                            onClick={() => joinSession(session)}
                            size="sm"
                            className="flex-1"
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
                            className="px-3"
                          >
                            <Share2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>

          {/* Actions */}
          <div className="px-6 py-4 border-t border-border/50 backdrop-blur-xl bg-background/95">
            <Button variant="outline" onClick={onClose} className="w-full rounded-full">
              Fermer
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Profile Preview Dialog */}
      <ProfilePreviewDialog 
        userId={selectedProfile} 
        onClose={() => setSelectedProfile(null)} 
      />

      {/* Share Session Dialog */}
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