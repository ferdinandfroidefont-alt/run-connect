import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useNavigate } from 'react-router-dom';
import { Users, UserPlus, Copy, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Club {
  id: string;
  group_name: string;
  group_description: string | null;
  group_avatar_url: string | null;
  club_code: string;
  created_by: string;
  location?: string | null;
  member_count?: number;
  is_member?: boolean;
}

export const ClubsTab = ({ searchQuery }: { searchQuery: string }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    if (searchQuery.trim()) {
      searchClubsByCode();
    } else {
      loadPublicClubs();
    }
  }, [searchQuery]);

  const searchClubsByCode = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('conversations')
        .select('id, group_name, group_description, group_avatar_url, club_code, created_by, location')
        .eq('is_group', true)
        .eq('club_code', searchQuery.toUpperCase())
        .limit(1);

      if (error) throw error;

      if (data && data.length > 0) {
        const clubsWithStats = await Promise.all(
          data.map(async (club) => {
            const { count: memberCount } = await supabase
              .from('group_members')
              .select('*', { count: 'exact', head: true })
              .eq('conversation_id', club.id);

            const { data: memberData } = await supabase
              .from('group_members')
              .select('id')
              .eq('conversation_id', club.id)
              .eq('user_id', user?.id)
              .single();

            return {
              ...club,
              member_count: memberCount || 0,
              is_member: !!memberData
            };
          })
        );

        setClubs(clubsWithStats);
      } else {
        setClubs([]);
      }
    } catch (error) {
      console.error('Error searching clubs:', error);
      setClubs([]);
    } finally {
      setLoading(false);
    }
  };

  const loadPublicClubs = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data: memberClubIds } = await supabase
        .from('group_members')
        .select('conversation_id')
        .eq('user_id', user.id);

      const excludedClubIds = memberClubIds?.map(item => item.conversation_id) || [];

      const { data, error } = await supabase
        .from('conversations')
        .select('id, group_name, group_description, group_avatar_url, club_code, created_by, location')
        .eq('is_group', true)
        .eq('is_private', false)
        .not('id', 'in', `(${excludedClubIds.length > 0 ? excludedClubIds.join(',') : 'null'})`)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      if (data) {
        const clubsWithStats = await Promise.all(
          data.map(async (club) => {
            const { count: memberCount } = await supabase
              .from('group_members')
              .select('*', { count: 'exact', head: true })
              .eq('conversation_id', club.id);

            return {
              ...club,
              member_count: memberCount || 0,
              is_member: false
            };
          })
        );

        setClubs(clubsWithStats);
      }
    } catch (error) {
      console.error('Error loading public clubs:', error);
      setClubs([]);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinClub = async (club: Club) => {
    if (!user || club.is_member) return;

    try {
      const { error } = await supabase
        .from('group_members')
        .insert([{
          conversation_id: club.id,
          user_id: user.id,
          is_admin: false
        }]);

      if (error) throw error;

      setClubs(prev => 
        prev.map(c => 
          c.id === club.id 
            ? { ...c, is_member: true, member_count: (c.member_count || 0) + 1 }
            : c
        )
      );

      toast({
        title: "Succès !",
        description: `Vous avez rejoint le club "${club.group_name}"`
      });

      navigate(`/messages?conversation=${club.id}`);
    } catch (error) {
      console.error('Error joining club:', error);
      toast({
        title: "Erreur",
        description: "Impossible de rejoindre le club",
        variant: "destructive"
      });
    }
  };

  const copyClubCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
      toast({
        title: "Code copié !",
        description: "Le code du club a été copié dans le presse-papiers"
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de copier le code",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="p-4 space-y-3">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (clubs.length === 0 && !loading) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <Users className="h-16 w-16 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">
          {searchQuery.trim() ? 'Aucun club trouvé' : 'Découvrez des clubs'}
        </h3>
        <p className="text-sm text-muted-foreground">
          {searchQuery.trim() 
            ? `Aucun club avec le code "${searchQuery}"`
            : 'Entrez un code de club ou parcourez les suggestions'
          }
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-3">
      {!searchQuery.trim() && (
        <div className="glass-card p-3 mb-4">
          <p className="text-sm text-muted-foreground">
            💡 Clubs publics suggérés (max 10)
          </p>
        </div>
      )}
      
      {clubs.map((club) => (
        <Card key={club.id} className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Avatar className="h-12 w-12">
                <AvatarImage src={club.group_avatar_url || undefined} />
                <AvatarFallback>
                  <Users className="h-6 w-6" />
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold truncate">{club.group_name}</h4>
                {club.group_description && (
                  <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                    {club.group_description}
                  </p>
                )}
                {club.location && (
                  <p className="text-xs text-muted-foreground mt-1">📍 {club.location}</p>
                )}
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="secondary" className="text-xs">
                    {club.member_count || 0} membres
                  </Badge>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => copyClubCode(club.club_code)}
                    className="h-7 px-2"
                  >
                    {copiedCode === club.club_code ? (
                      <Check className="h-3 w-3 mr-1" />
                    ) : (
                      <Copy className="h-3 w-3 mr-1" />
                    )}
                    <span className="text-xs font-mono">{club.club_code}</span>
                  </Button>
                </div>
              </div>

              {!club.is_member && (
                <Button
                  size="sm"
                  onClick={() => handleJoinClub(club)}
                  className="shrink-0"
                >
                  <UserPlus className="h-4 w-4 mr-1" />
                  Rejoindre
                </Button>
              )}
              {club.is_member && (
                <Badge variant="default" className="shrink-0">Membre</Badge>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
