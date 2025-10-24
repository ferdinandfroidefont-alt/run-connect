import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandGroup, CommandItem, CommandList } from '@/components/ui/command';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useNavigate } from 'react-router-dom';
import { Users, UserPlus, Copy, Check, Filter, ChevronsUpDown, Search } from 'lucide-react';
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

// Liste des départements français
const departments = [
  "01 - Ain", "02 - Aisne", "03 - Allier", "04 - Alpes-de-Haute-Provence", "05 - Hautes-Alpes",
  "06 - Alpes-Maritimes", "07 - Ardèche", "08 - Ardennes", "09 - Ariège", "10 - Aube",
  "11 - Aude", "12 - Aveyron", "13 - Bouches-du-Rhône", "14 - Calvados", "15 - Cantal",
  "16 - Charente", "17 - Charente-Maritime", "18 - Cher", "19 - Corrèze", "21 - Côte-d'Or",
  "22 - Côtes-d'Armor", "23 - Creuse", "24 - Dordogne", "25 - Doubs", "26 - Drôme",
  "27 - Eure", "28 - Eure-et-Loir", "29 - Finistère", "30 - Gard", "31 - Haute-Garonne",
  "32 - Gers", "33 - Gironde", "34 - Hérault", "35 - Ille-et-Vilaine", "36 - Indre",
  "37 - Indre-et-Loire", "38 - Isère", "39 - Jura", "40 - Landes", "41 - Loir-et-Cher",
  "42 - Loire", "43 - Haute-Loire", "44 - Loire-Atlantique", "45 - Loiret", "46 - Lot",
  "47 - Lot-et-Garonne", "48 - Lozère", "49 - Maine-et-Loire", "50 - Manche", "51 - Marne",
  "52 - Haute-Marne", "53 - Mayenne", "54 - Meurthe-et-Moselle", "55 - Meuse", "56 - Morbihan",
  "57 - Moselle", "58 - Nièvre", "59 - Nord", "60 - Oise", "61 - Orne", "62 - Pas-de-Calais",
  "63 - Puy-de-Dôme", "64 - Pyrénées-Atlantiques", "65 - Hautes-Pyrénées", "66 - Pyrénées-Orientales",
  "67 - Bas-Rhin", "68 - Haut-Rhin", "69 - Rhône", "70 - Haute-Saône", "71 - Saône-et-Loire",
  "72 - Sarthe", "73 - Savoie", "74 - Haute-Savoie", "75 - Paris", "76 - Seine-Maritime",
  "77 - Seine-et-Marne", "78 - Yvelines", "79 - Deux-Sèvres", "80 - Somme", "81 - Tarn",
  "82 - Tarn-et-Garonne", "83 - Var", "84 - Vaucluse", "85 - Vendée", "86 - Vienne",
  "87 - Haute-Vienne", "88 - Vosges", "89 - Yonne", "90 - Territoire de Belfort", "91 - Essonne",
  "92 - Hauts-de-Seine", "93 - Seine-Saint-Denis", "94 - Val-de-Marne", "95 - Val-d'Oise",
  "971 - Guadeloupe", "972 - Martinique", "973 - Guyane", "974 - La Réunion", "976 - Mayotte"
];

export const ClubsTab = ({ searchQuery }: { searchQuery: string }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [localSearchQuery, setLocalSearchQuery] = useState(searchQuery);
  const [selectedDepartment, setSelectedDepartment] = useState<string>("");
  const [departmentSearchOpen, setDepartmentSearchOpen] = useState(false);

  useEffect(() => {
    setLocalSearchQuery(searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    if (localSearchQuery.trim()) {
      searchClubsByCode();
    } else {
      loadPublicClubs();
    }
  }, [localSearchQuery, selectedDepartment]);

  const searchClubsByCode = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('conversations')
        .select('id, group_name, group_description, group_avatar_url, club_code, created_by, location')
        .eq('is_group', true)
        .eq('club_code', localSearchQuery.toUpperCase())
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

      let query = supabase
        .from('conversations')
        .select('id, group_name, group_description, group_avatar_url, club_code, created_by, location')
        .eq('is_group', true)
        .eq('is_private', false)
        .not('id', 'in', `(${excludedClubIds.length > 0 ? excludedClubIds.join(',') : 'null'})`)
        .order('created_at', { ascending: false });

      // Apply department filter if selected
      if (selectedDepartment && selectedDepartment.trim() !== "") {
        const departmentNumber = selectedDepartment.split(" - ")[0];
        const departmentName = selectedDepartment.split(" - ")[1];
        query = query.or(`location.ilike.%${departmentNumber}%,location.ilike.%${departmentName}%`);
      }

      const { data, error } = await query.limit(10);

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

  return (
    <div className="p-4 space-y-3">
      {/* Search and filters */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Code exact du club ou laissez vide..."
            value={localSearchQuery}
            onChange={(e) => setLocalSearchQuery(e.target.value.toUpperCase())}
            className="pl-10 font-mono glass-card"
            maxLength={8}
          />
        </div>
        
        {/* Department filter - only show when no search query */}
        {!localSearchQuery && (
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Popover open={departmentSearchOpen} onOpenChange={setDepartmentSearchOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={departmentSearchOpen}
                  className="w-full justify-between glass-card"
                >
                  {selectedDepartment || "Sélectionner un département..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0 glass-card">
                <Command>
                  <CommandList>
                    <ScrollArea className="h-[200px]">
                      <CommandGroup>
                        <CommandItem
                          value=""
                          onSelect={() => {
                            setSelectedDepartment("");
                            setDepartmentSearchOpen(false);
                          }}
                        >
                          <Check
                            className={`mr-2 h-4 w-4 ${selectedDepartment === "" ? "opacity-100" : "opacity-0"}`}
                          />
                          Tous les départements
                        </CommandItem>
                        {departments.map((dept) => (
                          <CommandItem
                            key={dept}
                            value={dept}
                            onSelect={(currentValue) => {
                              setSelectedDepartment(currentValue === selectedDepartment ? "" : currentValue);
                              setDepartmentSearchOpen(false);
                            }}
                          >
                            <Check
                              className={`mr-2 h-4 w-4 ${selectedDepartment === dept ? "opacity-100" : "opacity-0"}`}
                            />
                            {dept}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </ScrollArea>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
        )}
      </div>

      {!localSearchQuery && clubs.length > 0 && (
        <div className="glass-card p-3">
          <p className="text-sm text-muted-foreground">
            💡 Clubs publics suggérés{selectedDepartment && ` - ${selectedDepartment}`}
          </p>
        </div>
      )}

      {loading && (
        <div className="space-y-3">
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
      )}

      {!loading && clubs.length === 0 && (
        <div className="flex flex-col items-center justify-center p-8 text-center">
          <Users className="h-16 w-16 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">
            {localSearchQuery.trim() ? 'Aucun club trouvé' : 'Aucun club public disponible'}
          </h3>
          <p className="text-sm text-muted-foreground">
            {localSearchQuery.trim() 
              ? `Aucun club avec le code "${localSearchQuery}"`
              : selectedDepartment && selectedDepartment.trim() !== ""
                ? `Aucun club public dans ${selectedDepartment}`
                : 'Entrez un code de club exact pour rejoindre un club privé'
            }
          </p>
        </div>
      )}
      
      {!loading && clubs.map((club) => (
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
