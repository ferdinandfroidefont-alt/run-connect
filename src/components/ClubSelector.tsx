import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Users, Check, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { MapIosColoredFab } from '@/components/map/MapIosColoredFab';

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
  /**
   * compact = pastille 40×40 (carte, formulaires).
   * filterRow = même hauteur / largeur que le bouton « Amis uniquement » dans SessionFilters.
   */
  triggerMode?: 'compact' | 'filterRow';
}

export const ClubSelector: React.FC<ClubSelectorProps> = ({
  selectedClubId,
  onClubSelect,
  triggerMode = 'compact',
}) => {
  const { user } = useAuth();
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

  /** Identique au bouton « 👥 Amis uniquement » : Button size="sm" + h-8 w-full */
  const filterRowButtonClass = 'justify-start text-xs h-8 w-full gap-2';

  const filterRowLabel =
    triggerMode === 'filterRow'
      ? selectedClub
        ? selectedClub.group_name
        : clubs.length === 0
          ? 'Aucun club'
          : 'Filtrer par club'
      : '';

  if (loading) {
    if (triggerMode === 'filterRow') {
      return (
        <Button type="button" variant="outline" size="sm" disabled className={cn(filterRowButtonClass, 'cursor-wait opacity-90')}>
          <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
          <span className="min-w-0 truncate text-left">Chargement…</span>
        </Button>
      );
    }
    return (
      <MapIosColoredFab tone="gray" disabled aria-busy aria-label="Chargement des clubs" className="cursor-wait opacity-90">
        <Loader2 className="h-[18px] w-[18px] animate-spin" strokeWidth={2.25} aria-hidden />
      </MapIosColoredFab>
    );
  }

  if (clubs.length === 0) {
    return (
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          {triggerMode === 'filterRow' ? (
            <Button
              type="button"
              variant={selectedClubId ? 'default' : 'outline'}
              size="sm"
              className={filterRowButtonClass}
              aria-label={filterRowLabel}
            >
              <Users className="h-4 w-4 shrink-0" aria-hidden />
              <span className="min-w-0 truncate text-left">🏢 {filterRowLabel}</span>
            </Button>
          ) : (
            <MapIosColoredFab type="button" tone={selectedClubId ? "blue" : "gray"} active={!!selectedClubId} title="Clubs">
              <Users className="h-[18px] w-[18px]" strokeWidth={2.25} aria-hidden />
            </MapIosColoredFab>
          )}
        </PopoverTrigger>
        
        <PopoverContent className="w-80 p-2" align="start">
          <div className="space-y-1">
            <div className="flex items-center gap-2 p-3 text-muted-foreground">
              <Users className="h-4 w-4" />
              <span className="text-sm">Aucun club</span>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        {triggerMode === 'filterRow' ? (
          <Button
            type="button"
            variant={selectedClubId ? 'default' : 'outline'}
            size="sm"
            className={filterRowButtonClass}
            aria-label={selectedClub?.group_name || 'Filtrer par club'}
          >
            <Users className="h-4 w-4 shrink-0" aria-hidden />
            <span className="min-w-0 truncate text-left">
              {selectedClub ? `🏢 ${selectedClub.group_name}` : '🏢 Filtrer par club'}
            </span>
          </Button>
        ) : (
          <MapIosColoredFab type="button" tone={selectedClubId ? "blue" : "gray"} active={!!selectedClubId} title="Clubs">
            <Users className="h-[18px] w-[18px]" strokeWidth={2.25} aria-hidden />
          </MapIosColoredFab>
        )}
      </PopoverTrigger>
      
      <PopoverContent className="w-80 p-2" align="start">
        <div className="space-y-1">
          {/* Option "Tous les clubs" */}
          <Button
            variant="ghost"
            className={cn(
              "w-full justify-start h-16 p-3",
              !selectedClubId && "bg-accent"
            )}
            onClick={() => handleClubSelect(null)}
          >
              <div className="flex items-center gap-3 w-full">
                <div className="flex-shrink-0">
                  <Users className="h-5 w-5" />
                </div>
                <div className="flex-1 text-left min-w-0">
                  <div className="font-medium text-base leading-tight">Tous les clubs</div>
                  <div className="text-xs text-muted-foreground leading-tight">
                    Afficher toutes les sessions
                  </div>
                </div>
                {!selectedClubId && (
                  <div className="flex-shrink-0">
                    <Check className="h-4 w-4 text-primary" />
                  </div>
                )}
              </div>
            </Button>

          {/* Liste des clubs */}
          {clubs.map((club) => (
            <Button
              key={club.id}
              variant="ghost"
              className={cn(
                "w-full justify-start h-16 p-3",
                selectedClubId === club.id && "bg-accent"
              )}
              onClick={() => handleClubSelect(club.id)}
            >
              <div className="flex items-center gap-3 w-full">
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
                <div className="flex-1 text-left min-w-0">
                  <div className="font-medium text-base leading-tight truncate">{club.group_name}</div>
                  {club.group_description && (
                    <div className="text-xs text-muted-foreground leading-tight truncate">
                      {club.group_description}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
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