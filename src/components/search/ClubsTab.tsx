import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNavigate } from "react-router-dom";
import { Users, UserPlus, Copy, Check, Filter, ChevronsUpDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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

const departments = [
  "01 - Ain",
  "02 - Aisne",
  "03 - Allier",
  "04 - Alpes-de-Haute-Provence",
  "05 - Hautes-Alpes",
  "06 - Alpes-Maritimes",
  "07 - Ardèche",
  "08 - Ardennes",
  "09 - Ariège",
  "10 - Aube",
  "11 - Aude",
  "12 - Aveyron",
  "13 - Bouches-du-Rhône",
  "14 - Calvados",
  "15 - Cantal",
  "16 - Charente",
  "17 - Charente-Maritime",
  "18 - Cher",
  "19 - Corrèze",
  "21 - Côte-d'Or",
  "22 - Côtes-d'Armor",
  "23 - Creuse",
  "24 - Dordogne",
  "25 - Doubs",
  "26 - Drôme",
  "27 - Eure",
  "28 - Eure-et-Loir",
  "29 - Finistère",
  "30 - Gard",
  "31 - Haute-Garonne",
  "32 - Gers",
  "33 - Gironde",
  "34 - Hérault",
  "35 - Ille-et-Vilaine",
  "36 - Indre",
  "37 - Indre-et-Loire",
  "38 - Isère",
  "39 - Jura",
  "40 - Landes",
  "41 - Loir-et-Cher",
  "42 - Loire",
  "43 - Haute-Loire",
  "44 - Loire-Atlantique",
  "45 - Loiret",
  "46 - Lot",
  "47 - Lot-et-Garonne",
  "48 - Lozère",
  "49 - Maine-et-Loire",
  "50 - Manche",
  "51 - Marne",
  "52 - Haute-Marne",
  "53 - Mayenne",
  "54 - Meurthe-et-Moselle",
  "55 - Meuse",
  "56 - Morbihan",
  "57 - Moselle",
  "58 - Nièvre",
  "59 - Nord",
  "60 - Oise",
  "61 - Orne",
  "62 - Pas-de-Calais",
  "63 - Puy-de-Dôme",
  "64 - Pyrénées-Atlantiques",
  "65 - Hautes-Pyrénées",
  "66 - Pyrénées-Orientales",
  "67 - Bas-Rhin",
  "68 - Haut-Rhin",
  "69 - Rhône",
  "70 - Haute-Saône",
  "71 - Saône-et-Loire",
  "72 - Sarthe",
  "73 - Savoie",
  "74 - Haute-Savoie",
  "75 - Paris",
  "76 - Seine-Maritime",
  "77 - Seine-et-Marne",
  "78 - Yvelines",
  "79 - Deux-Sèvres",
  "80 - Somme",
  "81 - Tarn",
  "82 - Tarn-et-Garonne",
  "83 - Var",
  "84 - Vaucluse",
  "85 - Vendée",
  "86 - Vienne",
  "87 - Haute-Vienne",
  "88 - Vosges",
  "89 - Yonne",
  "90 - Territoire de Belfort",
  "91 - Essonne",
  "92 - Hauts-de-Seine",
  "93 - Seine-Saint-Denis",
  "94 - Val-de-Marne",
  "95 - Val-d'Oise",
  "971 - Guadeloupe",
  "972 - Martinique",
  "973 - Guyane",
  "974 - La Réunion",
  "976 - Mayotte",
];

export const ClubsTab = ({ searchQuery }: { searchQuery: string }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [selectedDepartment, setSelectedDepartment] = useState<string>("");
  const [departmentSearchOpen, setDepartmentSearchOpen] = useState(false);

  const codeQuery = searchQuery.trim().toUpperCase();

  const searchClubsByCode = useCallback(async () => {
    if (!codeQuery) {
      setClubs([]);
      return;
    }
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("conversations")
        .select("id, group_name, group_description, group_avatar_url, club_code, created_by, location")
        .eq("is_group", true)
        .not("club_code", "is", null)
        .neq("club_code", "")
        .eq("club_code", codeQuery)
        .limit(5);

      if (error) throw error;

      if (!data?.length) {
        setClubs([]);
        return;
      }

      const clubsWithStats = await Promise.all(
        data.map(async (club) => {
          const { count: memberCount } = await supabase
            .from("group_members")
            .select("*", { count: "exact", head: true })
            .eq("conversation_id", club.id);

          let isMember = false;
          if (user?.id) {
            const { data: memberData } = await supabase
              .from("group_members")
              .select("id")
              .eq("conversation_id", club.id)
              .eq("user_id", user.id)
              .maybeSingle();
            isMember = !!memberData;
          }

          return {
            ...club,
            member_count: memberCount || 0,
            is_member: isMember,
          };
        })
      );

      setClubs(clubsWithStats);
    } catch (error) {
      console.error("Error searching clubs:", error);
      setClubs([]);
    } finally {
      setLoading(false);
    }
  }, [codeQuery, user?.id]);

  const loadPublicClubs = useCallback(async () => {
    if (codeQuery) {
      return;
    }
    try {
      setLoading(true);

      let excludedClubIds: string[] = [];
      if (user?.id) {
        const { data: memberClubIds } = await supabase
          .from("group_members")
          .select("conversation_id")
          .eq("user_id", user.id);
        excludedClubIds = memberClubIds?.map((item) => item.conversation_id) || [];
      }

      let query = supabase
        .from("conversations")
        .select("id, group_name, group_description, group_avatar_url, club_code, created_by, location")
        .eq("is_group", true)
        .not("club_code", "is", null)
        .neq("club_code", "")
        .eq("is_private", false)
        .order("created_at", { ascending: false });

      if (excludedClubIds.length > 0) {
        query = query.not("id", "in", `(${excludedClubIds.join(",")})`);
      }

      if (selectedDepartment && selectedDepartment.trim() !== "") {
        const deptNum = selectedDepartment.split(" - ")[0]?.trim() ?? "";
        if (deptNum) {
          query = query.ilike("location", `%${deptNum}%`);
        }
      }

      const { data, error } = await query.limit(40);

      if (error) throw error;

      if (data?.length) {
        const clubsWithStats = await Promise.all(
          data.map(async (club) => {
            const { count: memberCount } = await supabase
              .from("group_members")
              .select("*", { count: "exact", head: true })
              .eq("conversation_id", club.id);

            return {
              ...club,
              member_count: memberCount || 0,
              is_member: false,
            };
          })
        );
        setClubs(clubsWithStats);
      } else {
        setClubs([]);
      }
    } catch (error) {
      console.error("Error loading public clubs:", error);
      setClubs([]);
    } finally {
      setLoading(false);
    }
  }, [codeQuery, user?.id, selectedDepartment]);

  useEffect(() => {
    if (codeQuery) {
      void searchClubsByCode();
    } else {
      void loadPublicClubs();
    }
  }, [codeQuery, loadPublicClubs, searchClubsByCode]);

  const handleJoinClub = async (club: Club) => {
    if (!user || club.is_member) return;

    try {
      const { error } = await supabase.from("group_members").insert([
        {
          conversation_id: club.id,
          user_id: user.id,
          is_admin: false,
        },
      ]);

      if (error) throw error;

      setClubs((prev) =>
        prev.map((c) =>
          c.id === club.id ? { ...c, is_member: true, member_count: (c.member_count || 0) + 1 } : c
        )
      );

      toast({
        title: "Succès !",
        description: `Vous avez rejoint le club "${club.group_name}"`,
      });

      navigate(`/messages?conversation=${club.id}`);
    } catch (error) {
      console.error("Error joining club:", error);
      toast({
        title: "Erreur",
        description: "Impossible de rejoindre le club",
        variant: "destructive",
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
        description: "Le code du club a été copié dans le presse-papiers",
      });
    } catch {
      toast({
        title: "Erreur",
        description: "Impossible de copier le code",
        variant: "destructive",
      });
    }
  };

  if (loading && clubs.length === 0) {
    return (
      <div className="bg-white">
        {[1, 2, 3].map((i) => (
          <div key={i} className="px-4 py-3">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-7 w-16 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="bg-white">
      <div className="space-y-3 px-4 py-3">
        {!codeQuery && (
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 shrink-0 text-muted-foreground" />
            <Popover open={departmentSearchOpen} onOpenChange={setDepartmentSearchOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={departmentSearchOpen}
                  className="w-full justify-between ios-surface rounded-ios-md"
                >
                  <span className="truncate text-left">
                    {selectedDepartment || "Filtrer par département (optionnel)"}
                  </span>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="ios-card z-[70] w-[calc(100vw-2rem)] p-0" align="start">
                <Command>
                  <CommandList>
                    <ScrollArea className="h-[300px]">
                      <CommandGroup>
                        <CommandItem
                          value="all"
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
                            onSelect={() => {
                              setSelectedDepartment(dept);
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

      {!codeQuery && clubs.length > 0 && (
        <div className="px-4 pb-2">
          <p className="text-sm text-muted-foreground">
            Clubs publics
            {selectedDepartment ? ` · ${selectedDepartment.split(" - ")[0]}` : ""}
          </p>
        </div>
      )}

      {codeQuery && (
        <div className="px-4 pb-2">
          <p className="text-sm text-muted-foreground">
            Recherche par code exact : <span className="font-mono font-semibold text-foreground">{codeQuery}</span>
          </p>
        </div>
      )}

      {!loading && clubs.length === 0 && (
        <div className="flex flex-col items-center justify-center p-8 text-center">
          <Users className="mb-4 h-16 w-16 text-muted-foreground" />
          <h3 className="mb-2 text-lg font-semibold">
            {codeQuery ? "Aucun club trouvé" : "Aucun club public disponible"}
          </h3>
          <p className="text-sm text-muted-foreground">
            {codeQuery
              ? `Aucun club avec le code « ${codeQuery} ». Vérifie le code ou demande un code à l’organisateur.`
              : selectedDepartment
                ? `Aucun club public ne correspond au département sélectionné (${selectedDepartment.split(" - ")[0]}).`
                : "Utilise la barre de recherche en haut pour un code de club, ou choisis un département."}
          </p>
        </div>
      )}

      {!loading &&
        clubs.map((club, index) => (
          <div key={club.id} className="relative">
            <div className="flex items-center gap-2.5 px-4 py-2.5">
              <Avatar className="h-9 w-9">
                <AvatarImage src={club.group_avatar_url || undefined} />
                <AvatarFallback>
                  <Users className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>

              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-semibold text-foreground">{club.group_name}</p>
                <p className="truncate text-[12px] text-muted-foreground">
                  Club · {club.location || "Ville a renseigner"}
                </p>
                <p className="text-[11px] text-muted-foreground/90">{club.member_count || 0} abonnes</p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => copyClubCode(club.club_code)}
                  className="h-7 px-2 text-[11px]"
                >
                  {copiedCode === club.club_code ? (
                    <Check className="mr-1 h-3 w-3" />
                  ) : (
                    <Copy className="mr-1 h-3 w-3" />
                  )}
                  <span className="font-mono text-[10px]">{club.club_code}</span>
                </Button>

                {!club.is_member && user && (
                  <Button size="sm" onClick={() => handleJoinClub(club)} className="h-7 rounded-full px-3 text-[11px]">
                    <UserPlus className="mr-1 h-3.5 w-3.5" />
                    Suivre
                  </Button>
                )}
                {club.is_member && (
                  <span className="rounded-full bg-secondary px-3 py-1 text-[11px] font-semibold text-foreground">Ouvrir</span>
                )}
              </div>
            </div>

            {index < clubs.length - 1 && (
              <div
                aria-hidden
                className="pointer-events-none absolute bottom-0 left-[62px] right-4 h-px bg-[linear-gradient(to_right,rgba(0,0,0,0),rgba(0,0,0,0.08)_10%,rgba(0,0,0,0.08)_90%,rgba(0,0,0,0))]"
              />
            )}
          </div>
        ))}
    </div>
  );
};
