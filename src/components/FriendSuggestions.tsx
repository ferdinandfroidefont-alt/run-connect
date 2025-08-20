import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { UserPlus, Users, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface FriendSuggestion {
  user_id: string;
  username: string;
  display_name: string;
  avatar_url: string;
  mutual_friends_count: number;
  mutual_friend_names: string[];
}

interface FriendSuggestionsProps {
  onClose?: () => void;
  compact?: boolean;
}

export const FriendSuggestions = ({ onClose, compact = false }: FriendSuggestionsProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [suggestions, setSuggestions] = useState<FriendSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [dismissedSuggestions, setDismissedSuggestions] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (user) {
      fetchSuggestions();
    }
  }, [user]);

  const fetchSuggestions = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase.rpc('get_friend_suggestions', {
        current_user_id: user.id,
        suggestion_limit: compact ? 3 : 10
      });

      if (error) throw error;
      setSuggestions(data || []);
    } catch (error) {
      console.error('Error fetching friend suggestions:', error);
    } finally {
      setLoading(false);
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

      // Remove from suggestions
      setSuggestions(prev => prev.filter(s => s.user_id !== targetUserId));
      toast({ 
        title: "Demande envoyée", 
        description: "Votre demande de suivi a été envoyée" 
      });
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

  if (visibleSuggestions.length === 0) {
    return null;
  }

  const SuggestionCard = ({ suggestion }: { suggestion: FriendSuggestion }) => (
    <Card key={suggestion.user_id} className="relative">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Avatar className="h-12 w-12">
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
              <Badge variant="secondary" className="text-xs">
                <Users className="h-3 w-3 mr-1" />
                {suggestion.mutual_friends_count} ami{suggestion.mutual_friends_count > 1 ? 's' : ''} en commun
              </Badge>
              
              {!compact && suggestion.mutual_friend_names.length > 0 && (
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
        {visibleSuggestions.slice(0, 3).map(suggestion => (
          <SuggestionCard key={suggestion.user_id} suggestion={suggestion} />
        ))}
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
    </Card>
  );
};