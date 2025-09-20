import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ProfilePreviewDialog } from "@/components/ProfilePreviewDialog";
import { ShareSessionToConversationDialog } from "@/components/ShareSessionToConversationDialog";
import { useToast } from "@/hooks/use-toast";
import { MapPin, Calendar, Users, Clock, UserPlus, Filter, Share2 } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

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
  { value: "natation", label: "Natation" },
  { value: "randonnee", label: "Randonnée" },
  { value: "fitness", label: "Fitness" },
  { value: "yoga", label: "Yoga" },
  { value: "football", label: "Football" },
  { value: "basketball", label: "Basketball" },
  { value: "tennis", label: "Tennis" },
  { value: "autre", label: "Autre" }
];

export const NearbySessionsDialog = ({ isOpen, onClose, userLocation }: NearbySessionsDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDistance, setSelectedDistance] = useState("1000");
  const [selectedUnit, setSelectedUnit] = useState("km");
  const [selectedActivity, setSelectedActivity] = useState<string>("all");
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
        
        // Convert distance based on selected unit
        const distance = selectedUnit === "m" ? distanceInKm * 1000 : distanceInKm;
        
        if (distance > parseInt(selectedDistance)) return false;

        // Activity filter
        if (selectedActivity !== "all" && session.activity_type !== selectedActivity) {
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
    
    if (selectedUnit === "m") {
      const distanceInM = distanceInKm * 1000;
      return distanceInM < 1000 
        ? `${Math.round(distanceInM)} m`
        : `${distanceInKm.toFixed(1)} km`;
    }
    
    return `${distanceInKm.toFixed(1)} km`;
  };

  useEffect(() => {
    if (isOpen) {
      loadNearbySessions();
    }
  }, [isOpen, selectedDistance, selectedUnit, selectedActivity, userLocation]);

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-full max-h-full h-screen w-screen">
          {/* Petite barre noire en haut comme dans Messages */}
          <div className="w-full h-6 bg-background"></div>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Séances à proximité
            </DialogTitle>
          </DialogHeader>

          {/* Filters */}
          <div className="flex gap-4 items-center">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              <span className="text-sm font-medium">Filtres:</span>
            </div>
            
            <div className="flex items-center gap-2">
              <Input
                type="number"
                placeholder="Distance"
                value={selectedDistance}
                onChange={(e) => setSelectedDistance(e.target.value)}
                className="w-24"
                min="1"
                max="500"
              />
              <Select value={selectedUnit} onValueChange={setSelectedUnit}>
                <SelectTrigger className="w-16">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="km">km</SelectItem>
                  <SelectItem value="m">m</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Select value={selectedActivity} onValueChange={setSelectedActivity}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Sport" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les sports</SelectItem>
                {ACTIVITY_TYPES.map(activity => (
                  <SelectItem key={activity.value} value={activity.value}>
                    {activity.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Sessions List */}
          <ScrollArea className="max-h-96">
            <div className="space-y-3">
              {loading ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Recherche des séances...</p>
                </div>
              ) : sessions.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Aucune séance trouvée</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Essayez d'élargir votre zone de recherche
                  </p>
                </div>
              ) : (
                sessions.map((session) => (
                  <Card key={session.id} className="transition-all hover:shadow-md">
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
          <div className="pt-4">
            <Button variant="outline" onClick={onClose} className="w-full">
              Fermer
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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