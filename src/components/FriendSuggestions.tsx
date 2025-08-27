import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { UserPlus, Users, X, Smartphone, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useContacts } from "@/hooks/useContacts";
import { useProfileNavigation } from "@/hooks/useProfileNavigation";
import { ProfilePreviewDialog } from "./ProfilePreviewDialog";

interface FriendSuggestion {
  user_id: string;
  username: string;
  display_name: string;
  avatar_url: string;
  mutual_friends_count: number;
  mutual_friend_names: string[];
  source: string;
  is_contact?: boolean;
}

interface FriendSuggestionsProps {
  onClose?: () => void;
  compact?: boolean;
}

export const FriendSuggestions = ({ onClose, compact = false }: FriendSuggestionsProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { isNative, hasPermission, requestPermissions, loadContacts } = useContacts();
  const { selectedUserId, showProfilePreview, navigateToProfile, closeProfilePreview } = useProfileNavigation();
  const [suggestions, setSuggestions] = useState<FriendSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [dismissedSuggestions, setDismissedSuggestions] = useState<Set<string>>(new Set());
  const [showContactsPermission, setShowContactsPermission] = useState(false);

  useEffect(() => {
    if (user) {
      fetchSuggestions();
      // Check if we should show contacts permission prompt
      if (isNative && !hasPermission) {
        setShowContactsPermission(true);
      }
    }
  }, [user, isNative, hasPermission]);

  const fetchSuggestions = async () => {
    if (!user) return;

    try {
      // Get friend suggestions with proper priority (max 5)
      const { data, error } = await supabase.rpc('get_friend_suggestions', {
        current_user_id: user.id,
        suggestion_limit: 5
      });

      if (error) throw error;
      
      let allSuggestions = data || [];

      // If we have contacts permission, enhance suggestions with contact info
      if (isNative && hasPermission) {
        try {
          const contacts = await loadContacts();
          const contactSuggestions = await findContactSuggestions(contacts);
          
          // Prioritize contact suggestions: contacts > mutual friends > active users
          const mutualFriendSuggestions = allSuggestions.filter(
            (s: FriendSuggestion) => s.source === 'mutual_friends' && 
            !contactSuggestions.some((c: FriendSuggestion) => c.user_id === s.user_id)
          );
          
          const activeUserSuggestions = allSuggestions.filter(
            (s: FriendSuggestion) => s.source === 'active_users' && 
            !contactSuggestions.some((c: FriendSuggestion) => c.user_id === s.user_id)
          );
          
          // Combine in priority order and limit to 5
          allSuggestions = [
            ...contactSuggestions,
            ...mutualFriendSuggestions,
            ...activeUserSuggestions
          ].slice(0, 5);
        } catch (contactError) {
          console.error('Error loading contact suggestions:', contactError);
        }
      } else {
        // Limit to 5 when no contacts
        allSuggestions = allSuggestions.slice(0, 5);
      }

      setSuggestions(allSuggestions);
    } catch (error) {
      console.error('Error fetching friend suggestions:', error);
    } finally {
      setLoading(false);
    }
  };

  const findContactSuggestions = async (contacts: any[]) => {
    if (!contacts || contacts.length === 0) return [];

    try {
      // Extract phone numbers and emails from contacts
      const phoneNumbers: string[] = [];
      const emails: string[] = [];

      contacts.forEach(contact => {
        contact.phoneNumbers?.forEach((phone: any) => {
          if (phone.number) {
            // Clean phone number (remove spaces, dashes, etc.)
            const cleanNumber = phone.number.replace(/[\s\-\(\)]/g, '');
            phoneNumbers.push(cleanNumber);
          }
        });
        
        contact.emails?.forEach((email: any) => {
          if (email.address) {
            emails.push(email.address.toLowerCase());
          }
        });
      });

      if (phoneNumbers.length === 0 && emails.length === 0) return [];

      // Find users with matching phone numbers or emails
      const { data: matchingUsers, error } = await supabase
        .from('profiles')
        .select('user_id, username, display_name, avatar_url, phone')
        .neq('user_id', user!.id)
        .or(`phone.in.(${phoneNumbers.map(p => `"${p}"`).join(',')})`);

      if (error) throw error;

      // Convert to friend suggestions format
      const contactSuggestions = (matchingUsers || []).map(profile => ({
        user_id: profile.user_id,
        username: profile.username || profile.display_name || 'Utilisateur',
        display_name: profile.display_name || profile.username || 'Utilisateur',
        avatar_url: profile.avatar_url || '',
        mutual_friends_count: 0,
        mutual_friend_names: [],
        source: 'contacts',
        is_contact: true
      }));

      return contactSuggestions;
    } catch (error) {
      console.error('Error finding contact suggestions:', error);
      return [];
    }
  };

  const handleRequestContactsPermission = async () => {
    const granted = await requestPermissions();
    if (granted) {
      setShowContactsPermission(false);
      toast({
        title: "Contacts autorisés",
        description: "Nous allons maintenant améliorer vos suggestions d'amis"
      });
      // Refresh suggestions with contacts
      fetchSuggestions();
    } else {
      toast({
        title: "Permission refusée",
        description: "Vous pouvez activer l'accès aux contacts dans les paramètres de votre téléphone",
        variant: "destructive"
      });
    }
  };

  const sendFollowRequest = async (targetUserId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('user_follows')
        .insert([{
          follower_id: user.id,
          following_id: targetUserId,
          status: 'pending'
        }]);

      if (error) throw error;

      // Remove from suggestions and refresh to get new ones
      setSuggestions(prev => prev.filter(s => s.user_id !== targetUserId));
      toast({ 
        title: "Demande envoyée", 
        description: "Votre demande de suivi a été envoyée" 
      });

      // Refresh suggestions to fill the gap
      setTimeout(() => {
        fetchSuggestions();
      }, 500);
    } catch (error: any) {
      toast({ 
        title: "Erreur", 
        description: "Impossible d'envoyer la demande", 
        variant: "destructive" 
      });
    }
  };

  const dismissSuggestion = (userId: string) => {
    setDismissedSuggestions(prev => new Set([...prev, userId]));
    setSuggestions(prev => prev.filter(s => s.user_id !== userId));
    
    // Refresh suggestions to get new ones
    setTimeout(() => {
      fetchSuggestions();
    }, 300);
  };

  const visibleSuggestions = suggestions.filter(s => !dismissedSuggestions.has(s.user_id));

  if (loading) {
    return (
      <Card className={compact ? "" : "max-w-md mx-auto"}>
        <CardContent className="p-6 text-center">
          <Users className="h-8 w-8 text-muted-foreground mx-auto mb-2 animate-pulse" />
          <p className="text-sm text-muted-foreground">Recherche de suggestions...</p>
        </CardContent>
      </Card>
    );
  }

  if (visibleSuggestions.length === 0 && !showContactsPermission) {
    return null;
  }

  // Show contacts permission prompt
  if (showContactsPermission && !compact) {
    return (
      <Card className="max-w-md mx-auto">
        <CardContent className="p-6 text-center">
          <Smartphone className="h-12 w-12 text-primary mx-auto mb-4" />
          <h3 className="font-semibold mb-2">Trouvez vos amis facilement</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Autorisez l'accès à vos contacts pour trouver vos amis qui utilisent déjà RunConnect
          </p>
          <div className="flex items-center justify-center gap-2 mb-4 text-xs text-muted-foreground">
            <Shield className="h-4 w-4" />
            <span>Vos contacts restent privés et sécurisés</span>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => setShowContactsPermission(false)}
              className="flex-1"
            >
              Plus tard
            </Button>
            <Button 
              onClick={handleRequestContactsPermission}
              className="flex-1"
            >
              Autoriser les contacts
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const SuggestionCard = ({ suggestion }: { suggestion: FriendSuggestion }) => (
    <Card key={suggestion.user_id} className="relative">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Avatar 
            className="h-12 w-12 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => navigateToProfile(suggestion.user_id)}
          >
            <AvatarImage src={suggestion.avatar_url} />
            <AvatarFallback>
              {suggestion.username?.[0] || suggestion.display_name?.[0] || '?'}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <div>
                <p className="font-medium truncate">
                  {suggestion.username || suggestion.display_name}
                </p>
                <p className="text-sm text-muted-foreground truncate">
                  @{suggestion.username}
                </p>
              </div>
              {!compact && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => dismissSuggestion(suggestion.user_id)}
                  className="h-6 w-6 p-0 hover:bg-muted"
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
            
            <div className="mb-3">
              {suggestion.is_contact ? (
                <Badge variant="default" className="text-xs bg-green-100 text-green-800 border-green-200">
                  <Smartphone className="h-3 w-3 mr-1" />
                  Dans vos contacts
                </Badge>
              ) : suggestion.source === 'mutual_friends' ? (
                <Badge variant="secondary" className="text-xs">
                  <Users className="h-3 w-3 mr-1" />
                  {suggestion.mutual_friends_count} ami{suggestion.mutual_friends_count > 1 ? 's' : ''} en commun
                </Badge>
              ) : (
                <Badge variant="outline" className="text-xs">
                  Utilisateur actif
                </Badge>
              )}
              
              {!compact && !suggestion.is_contact && suggestion.mutual_friend_names.length > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  {suggestion.mutual_friend_names.slice(0, 2).join(', ')}
                  {suggestion.mutual_friend_names.length > 2 && ` et ${suggestion.mutual_friend_names.length - 2} autre${suggestion.mutual_friend_names.length > 3 ? 's' : ''}`}
                </p>
              )}
            </div>
            
            <Button
              size="sm"
              onClick={() => sendFollowRequest(suggestion.user_id)}
              className="w-full"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Suivre
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (compact) {
    return (
      <div className="space-y-2">
        {visibleSuggestions.slice(0, 5).map(suggestion => (
          <SuggestionCard key={suggestion.user_id} suggestion={suggestion} />
        ))}
        <ProfilePreviewDialog 
          userId={selectedUserId} 
          onClose={closeProfilePreview}
        />
      </div>
    );
  }

  return (
    <Card className="max-w-md mx-auto">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-lg">Suggestions d'amis</CardTitle>
        {onClose && (
          <Button size="sm" variant="ghost" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-3 max-h-96 overflow-y-auto">
        {visibleSuggestions.map(suggestion => (
          <SuggestionCard key={suggestion.user_id} suggestion={suggestion} />
        ))}
      </CardContent>

      <ProfilePreviewDialog 
        userId={selectedUserId} 
        onClose={closeProfilePreview}
      />
    </Card>
  );
};