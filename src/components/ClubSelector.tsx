import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Users, ChevronDown, Check, Crown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

interface Club {
  id: string;
  group_name: string;
  group_description: string;
  group_avatar_url: string | null;
  member_count: number;
}

interface ClubSelectorProps {
  selectedClubId: string | null;
  onClubSelect: (clubId: string | null) => void;
}

export const ClubSelector: React.FC<ClubSelectorProps> = ({
  selectedClubId,
  onClubSelect
}) => {
  const { user, subscriptionInfo } = useAuth();
  const navigate = useNavigate();
  const [clubs, setClubs] = useState<Club[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const loadUserClubs = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Récupérer les clubs où l'utilisateur est membre
      const { data: memberData } = await supabase
        .from('group_members')
        .select('conversation_id')
        .eq('user_id', user.id);

      if (!memberData || memberData.length === 0) {
        setClubs([]);
        return;
      }

      const clubIds = memberData.map(m => m.conversation_id);

      // Récupérer les informations des clubs
      const { data: clubsData } = await supabase
        .from('conversations')
        .select('id, group_name, group_description, group_avatar_url')
        .in('id', clubIds)
        .eq('is_group', true)
        .order('group_name');

      if (clubsData) {
        // Compter les membres de chaque club
        const clubsWithCount = await Promise.all(
          clubsData.map(async (club) => {
            const { count } = await supabase
              .from('group_members')
              .select('*', { count: 'exact', head: true })
              .eq('conversation_id', club.id);

            return {
              ...club,
              member_count: count || 0
            };
          })
        );

        setClubs(clubsWithCount);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des clubs:', error);
      setClubs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUserClubs();
  }, [user]);

  const selectedClub = clubs.find(club => club.id === selectedClubId);

  const handleClubSelect = (clubId: string | null) => {
    onClubSelect(clubId);
    setIsOpen(false);
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 p-2 bg-card rounded-lg border">
        <Users className="h-4 w-4" />
        <span className="text-sm">Chargement des clubs...</span>
      </div>
    );
  }

  if (clubs.length === 0) {
    return (
      <div className="flex items-center gap-2 p-2 bg-card rounded-lg border opacity-50">
        <Users className="h-4 w-4" />
        <span className="text-sm">Aucun club</span>
      </div>
    );
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="outline" 
          className="w-full justify-between bg-card hover:bg-accent"
        >
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span className="truncate">
              {selectedClub ? selectedClub.group_name : 'Tous les clubs'}
            </span>
            {selectedClub && (
              <Badge variant="secondary" className="ml-1">
                {selectedClub.member_count}
              </Badge>
            )}
          </div>
          <ChevronDown className="h-4 w-4 shrink-0" />
        </Button>
      </PopoverTrigger>
      
      <PopoverContent className="w-80 p-2" align="start">
        <div className="space-y-1">
          {/* Option "Tous les clubs" - Premium Feature */}
          {subscriptionInfo?.subscribed ? (
            <Button
              variant="ghost"
              className={cn(
                "w-full justify-start h-auto p-3",
                !selectedClubId && "bg-accent"
              )}
              onClick={() => handleClubSelect(null)}
            >
              <div className="flex items-center gap-2 w-full">
                <div className="flex-shrink-0">
                  <Users className="h-4 w-4" />
                </div>
                <div className="flex-1 text-left">
                  <div className="font-medium">Tous les clubs</div>
                  <div className="text-xs text-muted-foreground">
                    Afficher toutes les sessions
                  </div>
                </div>
                {!selectedClubId && (
                  <Check className="h-4 w-4 text-primary" />
                )}
              </div>
            </Button>
          ) : (
            <Button
              variant="ghost"
              className="w-full justify-start h-auto p-3 bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 hover:from-yellow-100 hover:to-orange-100"
              onClick={() => {
                navigate('/subscription');
                setIsOpen(false);
              }}
            >
              <div className="flex items-center gap-2 w-full">
                <div className="flex-shrink-0">
                  <Users className="h-4 w-4 text-yellow-700" />
                </div>
                <div className="flex-1 text-left">
                  <div className="font-medium text-yellow-700">Tous les clubs</div>
                  <div className="text-xs text-yellow-600">
                    Fonctionnalité premium
                  </div>
                </div>
                <Crown className="h-4 w-4 text-yellow-500" />
              </div>
            </Button>
          )}

          {/* Liste des clubs */}
          {clubs.map((club) => (
            <Button
              key={club.id}
              variant="ghost"
              className={cn(
                "w-full justify-start h-auto p-3",
                selectedClubId === club.id && "bg-accent"
              )}
              onClick={() => handleClubSelect(club.id)}
            >
              <div className="flex items-center gap-2 w-full">
                <div className="flex-shrink-0">
                  {club.group_avatar_url ? (
                    <img 
                      src={club.group_avatar_url} 
                      alt={club.group_name}
                      className="h-8 w-8 rounded-full object-cover"
                    />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <Users className="h-4 w-4" />
                    </div>
                  )}
                </div>
                <div className="flex-1 text-left">
                  <div className="font-medium truncate">{club.group_name}</div>
                  {club.group_description && (
                    <div className="text-xs text-muted-foreground truncate">
                      {club.group_description}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    {club.member_count}
                  </Badge>
                  {selectedClubId === club.id && (
                    <Check className="h-4 w-4 text-primary" />
                  )}
                </div>
              </div>
            </Button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};