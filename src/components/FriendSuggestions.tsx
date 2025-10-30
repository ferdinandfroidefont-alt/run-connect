import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
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
    
    console.log('🔍 fetchSuggestions - START');
    console.log('- isNative:', isNative);
    console.log('- hasPermission:', hasPermission);

    try {
      let contactSuggestions: FriendSuggestion[] = [];
      
      // Priorité 1: Contacts (si permissions accordées)
      if (isNative && hasPermission) {
        console.log('🔍 Loading contacts...');
        try {
          const contacts = await loadContacts();
          console.log('🔍 Contacts loaded:', contacts?.length || 0);
          contactSuggestions = await findContactSuggestions(contacts);
          console.log('🔍 Contact suggestions processed:', contactSuggestions.length);
        } catch (contactError) {
          console.error('❌ Error loading contact suggestions:', contactError);
        }
      } else {
        console.log('🔍 Skipping contacts - isNative:', isNative, 'hasPermission:', hasPermission);
      }

      // Utiliser la nouvelle fonction avec ordre de priorité
      const { data, error } = await supabase.rpc('get_friend_suggestions_prioritized', {
        current_user_id: user.id,
        suggestion_limit: 10
      });

      if (error) throw error;
      
      let allSuggestions = data || [];

      // Intégrer les suggestions de contacts en priorité 1
      if (contactSuggestions.length > 0) {
        // Marquer les contacts avec priority_order = 1
        const contactsWithPriority = contactSuggestions.map(contact => ({
          ...contact,
          priority_order: 1
        }));
        
        // Filtrer les suggestions DB pour éviter les doublons avec les contacts
        const filteredDbSuggestions = allSuggestions.filter(
          (s: any) => !contactSuggestions.some((c: FriendSuggestion) => c.user_id === s.user_id)
        );
        
        // Combiner avec ordre de priorité: contacts (1), puis DB suggestions (2-5)
        allSuggestions = [
          ...contactsWithPriority,
          ...filteredDbSuggestions
        ].slice(0, 10);
      }

      setSuggestions(allSuggestions);
    } catch (error) {
      console.error('Error fetching friend suggestions:', error);
    } finally {
      setLoading(false);
    }
  };

  const findContactSuggestions = async (contacts: any[]) => {
    console.log('🔍 findContactSuggestions - START with contacts:', contacts?.length || 0);
    if (!contacts || contacts.length === 0) {
      console.log('🔍 No contacts provided');
      return [];
    }

    try {
      // Extract phone numbers and emails from contacts
      const phoneNumbers: string[] = [];
      const emails: string[] = [];
      const contactNames: string[] = [];

      contacts.forEach((contact, index) => {
        console.log(`🔍 Processing contact ${index + 1}:`, contact.displayName || 'No name');
        
        // Ajouter les noms pour un matching plus large
        if (contact.displayName) {
          contactNames.push(contact.displayName.toLowerCase());
        }
        
        contact.phoneNumbers?.forEach((phone: any) => {
          if (phone.number) {
            console.log('  📱 Phone found:', phone.number);
            // Clean phone number (remove spaces, dashes, etc.) and try multiple formats
            const cleanNumber = phone.number.replace(/[\s\-\(\)\+]/g, '');
            phoneNumbers.push(cleanNumber);
            
            // Add variations (with/without country code)
            if (cleanNumber.startsWith('33') && cleanNumber.length >= 11) {
              const national = '0' + cleanNumber.substring(2);
              phoneNumbers.push(national);
              console.log('  📱 Added national format:', national);
            }
            if (cleanNumber.startsWith('0') && cleanNumber.length === 10) {
              const international = '33' + cleanNumber.substring(1);
              phoneNumbers.push(international);
              console.log('  📱 Added international format:', international);
            }
          }
        });
        
        contact.emails?.forEach((email: any) => {
          if (email.address) {
            console.log('  📧 Email found:', email.address);
            emails.push(email.address.toLowerCase());
          }
        });
      });

      console.log('🔍 Extracted data:');
      console.log('  📱 Phone numbers:', phoneNumbers.length, phoneNumbers);
      console.log('  📧 Emails:', emails.length, emails);
      console.log('  👤 Names:', contactNames.length, contactNames);

      if (phoneNumbers.length === 0 && emails.length === 0 && contactNames.length === 0) {
        console.log('🔍 No contact data to search with');
        return [];
      }

      // Find users with matching phone numbers, emails, or similar names
      let matchingUsers: any[] = [];
      
      // Recherche par téléphone
      if (phoneNumbers.length > 0) {
        const { data: phoneMatches } = await supabase
          .from('profiles')
          .select('user_id, username, display_name, avatar_url, phone')
          .neq('user_id', user!.id)
          .or(`phone.in.(${phoneNumbers.map(p => `"${p}"`).join(',')})`);
        
        if (phoneMatches) matchingUsers.push(...phoneMatches);
      }

      // Recherche par nom similaire (matching approximatif)
      if (contactNames.length > 0) {
        const { data: nameMatches } = await supabase
          .from('profiles')
          .select('user_id, username, display_name, avatar_url, phone')
          .neq('user_id', user!.id)
          .or(
            contactNames.map(name => 
              `display_name.ilike.%${name}%,username.ilike.%${name}%`
            ).join(',')
          );
        
        if (nameMatches) {
          // Filtrer pour éviter des correspondances trop larges
          const filteredNameMatches = nameMatches.filter(profile => {
            const profileName = (profile.display_name || profile.username || '').toLowerCase();
            return contactNames.some(contactName => 
              profileName.includes(contactName) || contactName.includes(profileName)
            );
          });
          matchingUsers.push(...filteredNameMatches);
        }
      }

      // Supprimer les doublons
      const uniqueUsers = matchingUsers.reduce((acc, current) => {
        const exists = acc.find((item: any) => item.user_id === current.user_id);
        if (!exists) {
          acc.push(current);
        }
        return acc;
      }, []);

      // Convert to friend suggestions format
      const contactSuggestions = uniqueUsers.map(profile => ({
        user_id: profile.user_id,
        username: profile.username || profile.display_name || 'Utilisateur',
        display_name: profile.display_name || profile.username || 'Utilisateur',
        avatar_url: profile.avatar_url || '',
        mutual_friends_count: 0,
        mutual_friend_names: [],
        source: 'contacts',
        is_contact: true
      }));

      console.log('🔍 Contact suggestions found:', contactSuggestions.length, contactSuggestions);
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
    <Card className="relative h-full">
      <CardContent className="p-6">
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="relative">
            <Avatar 
              className="h-20 w-20 cursor-pointer hover:opacity-80 transition-opacity border-2 border-primary/20"
              onClick={() => navigateToProfile(suggestion.user_id)}
            >
              <AvatarImage src={suggestion.avatar_url} />
              <AvatarFallback className="text-lg">
                {suggestion.username?.[0] || suggestion.display_name?.[0] || '?'}
              </AvatarFallback>
            </Avatar>
            {!compact && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => dismissSuggestion(suggestion.user_id)}
                className="absolute -top-2 -right-2 h-6 w-6 p-0 rounded-full bg-background border hover:bg-muted"
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
          
          <div className="space-y-2">
            <div>
              <p className="font-semibold text-lg">
                {suggestion.username || suggestion.display_name}
              </p>
              <p className="text-sm text-muted-foreground">
                @{suggestion.username}
              </p>
            </div>
            
            <div className="flex justify-center">
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
              ) : suggestion.source === 'common_clubs' ? (
                <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                  <Users className="h-3 w-3 mr-1" />
                  Club en commun
                </Badge>
              ) : suggestion.source === 'friends_of_friends' ? (
                <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
                  <Users className="h-3 w-3 mr-1" />
                  Ami d'ami d'ami
                </Badge>
              ) : (
                <Badge variant="outline" className="text-xs">
                  Utilisateur actif
                </Badge>
              )}
            </div>
            
            {!compact && !suggestion.is_contact && suggestion.mutual_friend_names.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {suggestion.mutual_friend_names.slice(0, 2).join(', ')}
                {suggestion.mutual_friend_names.length > 2 && ` et ${suggestion.mutual_friend_names.length - 2} autre${suggestion.mutual_friend_names.length > 3 ? 's' : ''}`}
              </p>
            )}
          </div>
          
          <Button
            onClick={() => sendFollowRequest(suggestion.user_id)}
            className="w-full max-w-xs"
            size="lg"
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Suivre
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  if (compact) {
    return (
      <div className="w-full">
        <Carousel
          opts={{
            align: "center",
            loop: true,
            slidesToScroll: 1,
            dragFree: false,
            containScroll: "trimSnaps",
            skipSnaps: false,
          }}
          className="w-full"
        >
          <CarouselContent>
            {visibleSuggestions.map((suggestion) => (
              <CarouselItem key={suggestion.user_id} className="basis-full">
                <SuggestionCard suggestion={suggestion} />
              </CarouselItem>
            ))}
          </CarouselContent>
          {visibleSuggestions.length > 1 && (
            <>
              <CarouselPrevious className="left-0 translate-x-0" />
              <CarouselNext className="right-0 translate-x-0" />
            </>
          )}
        </Carousel>
        <ProfilePreviewDialog 
          userId={selectedUserId} 
          onClose={closeProfilePreview}
        />
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Suggestions d'amis</h2>
        {onClose && (
          <Button size="sm" variant="ghost" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
      
      <Carousel
          opts={{
            align: "center",
            loop: true,
            slidesToScroll: 1,
            dragFree: false,
            containScroll: "trimSnaps",
            skipSnaps: false,
          }}
          className="w-full"
        >
          <CarouselContent className="h-full">
            {visibleSuggestions.map((suggestion) => (
              <CarouselItem key={suggestion.user_id} className="basis-full">
                <div className="h-[420px] flex items-center justify-center">
                  <SuggestionCard suggestion={suggestion} />
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
        {visibleSuggestions.length > 1 && (
          <>
            <CarouselPrevious className="left-0 translate-x-0" />
            <CarouselNext className="right-0 translate-x-0" />
          </>
        )}
      </Carousel>
      
      {visibleSuggestions.length > 1 && (
        <div className="flex justify-center mt-4 space-x-1">
          {visibleSuggestions.map((_, index) => (
            <div
              key={index}
              className="w-2 h-2 rounded-full bg-muted-foreground/30"
            />
          ))}
        </div>
      )}

      <ProfilePreviewDialog 
        userId={selectedUserId} 
        onClose={closeProfilePreview}
      />
    </div>
  );
};