import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNavigate } from "react-router-dom";
import { Users, Copy, Check, Filter, ChevronsUpDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  gradientForSearchLetter,
  messageSearchResultCardStyle,
  MESSAGE_SEARCH_MAQUETTE_BLUE,
} from "@/lib/messageSearchMaquette";

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
      <div className="space-y-2 px-3 pb-6 pt-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3 px-3 py-3" style={messageSearchResultCardStyle}>
            <Skeleton className="h-[50px] w-[50px] shrink-0 rounded-full" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3.5 w-32" />
            </div>
            <Skeleton className="h-9 w-24 shrink-0 rounded-full" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="min-w-0">
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
        <div className="flex flex-col items-center px-8 py-16 text-center">
          <div
            className="mb-4 flex h-[72px] w-[72px] items-center justify-center rounded-full bg-[#F2F2F7]"
            aria-hidden
          >
            <Users className="h-9 w-9 text-[#8E8E93]" strokeWidth={1.8} />
          </div>
          <p className="m-0 text-[19px] font-extrabold tracking-tight text-[#0A0F1F]">
            {codeQuery ? "Aucun club trouvé" : "Aucun club public disponible"}
          </p>
          <p className="mb-0 mt-1.5 max-w-[300px] text-[15px] leading-snug text-[#8E8E93]">
            {codeQuery
              ? `Aucun club avec le code « ${codeQuery} ». Vérifie le code ou demande un code à l’organisateur.`
              : selectedDepartment
                ? `Aucun club public ne correspond au département sélectionné (${selectedDepartment.split(" - ")[0]}).`
                : "Utilise la barre de recherche en haut pour un code de club, ou choisis un département."}
          </p>
        </div>
      )}

      {!loading ? (
        <div className="space-y-2 px-3 pb-6 pt-1">
          {clubs.map((club) => {
            const initial = (club.group_name?.trim()?.[0] || "C").toUpperCase();
            const loc = club.location?.trim() || "Club";

            return (
              <div
                key={club.id}
                className={`flex w-full items-center gap-3 px-3 py-3 text-left transition-transform ${
                  club.is_member ? "cursor-pointer active:scale-[0.99]" : ""
                }`}
                style={messageSearchResultCardStyle}
                onClick={() => {
                  if (club.is_member) navigate(`/messages?conversation=${club.id}`);
                }}
                onKeyDown={(e) => {
                  if (!club.is_member) return;
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    navigate(`/messages?conversation=${club.id}`);
                  }
                }}
                role={club.is_member ? "button" : undefined}
                tabIndex={club.is_member ? 0 : undefined}
              >
                <div className="relative h-[50px] w-[50px] shrink-0">
                  {club.group_avatar_url ? (
                    <Avatar className="h-[50px] w-[50px] border-0 shadow-[0_2px_6px_rgba(0,0,0,0.12)]">
                      <AvatarImage src={club.group_avatar_url} className="object-cover" />
                      <AvatarFallback
                        className="text-lg font-black text-white"
                        style={{ background: gradientForSearchLetter(initial) }}
                      >
                        <Users className="h-6 w-6 text-white" strokeWidth={2.4} />
                      </AvatarFallback>
                    </Avatar>
                  ) : (
                    <div
                      className="flex h-[50px] w-[50px] items-center justify-center rounded-full shadow-[0_2px_6px_rgba(0,0,0,0.12)]"
                      style={{ background: gradientForSearchLetter(initial) }}
                    >
                      <Users className="h-6 w-6 text-white" strokeWidth={2.4} />
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="m-0 truncate text-base font-extrabold leading-tight tracking-tight text-[#0A0F1F]">
                    {club.group_name}
                  </p>
                  <p className="m-0 mt-0.5 truncate text-[13px] font-semibold text-[#8E8E93]">
                    {club.member_count ?? 0} membres
                    <span className="opacity-60"> · </span>
                    {loc}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-9 w-9 text-[#8E8E93]"
                    onClick={(e) => {
                      e.stopPropagation();
                      void copyClubCode(club.club_code);
                    }}
                    aria-label={`Copier le code ${club.club_code}`}
                  >
                    {copiedCode === club.club_code ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>

                  {club.is_member ? (
                    <span className="rounded-full bg-[#F2F2F7] px-4 py-2 text-sm font-extrabold tracking-tight text-[#0A0F1F]">
                      Membre
                    </span>
                  ) : user ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        void handleJoinClub(club);
                      }}
                      className="rounded-full px-4 py-2 text-sm font-extrabold tracking-tight text-white shadow-[0_3px_10px_rgba(0,122,255,0.25)] transition-transform active:scale-95"
                      style={{ background: MESSAGE_SEARCH_MAQUETTE_BLUE }}
                    >
                      Rejoindre
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
};
