import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Users, Check, Filter, ChevronsUpDown } from "lucide-react";
import { ClubResultRow } from "@/components/search/ClubResultRow";
import { searchClubsByText, type ClubSearchHit } from "@/components/search/searchQueries";

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
  const [clubs, setClubs] = useState<ClubSearchHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState<string>("");
  const [departmentSearchOpen, setDepartmentSearchOpen] = useState(false);

  const q = searchQuery.trim();
  const codeQuery = q.toUpperCase();
  const isLikelyCode = q.length >= 4 && q === codeQuery && /^[A-Z0-9]+$/.test(codeQuery);

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

      setClubs(clubsWithStats as ClubSearchHit[]);
    } catch (error) {
      console.error("Error searching clubs:", error);
      setClubs([]);
    } finally {
      setLoading(false);
    }
  }, [codeQuery, user?.id]);

  const loadPublicClubs = useCallback(async () => {
    if (q) {
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
        setClubs(clubsWithStats as ClubSearchHit[]);
      } else {
        setClubs([]);
      }
    } catch (error) {
      console.error("Error loading public clubs:", error);
      setClubs([]);
    } finally {
      setLoading(false);
    }
  }, [q, user?.id, selectedDepartment]);

  useEffect(() => {
    if (q.length >= 2 && !isLikelyCode) return;
    if (isLikelyCode) {
      void searchClubsByCode();
      return;
    }
    if (!q) {
      void loadPublicClubs();
      return;
    }
    setClubs([]);
    setLoading(false);
  }, [q, isLikelyCode, loadPublicClubs, searchClubsByCode]);

  useEffect(() => {
    if (q.length < 2 || isLikelyCode) return;
    let cancelled = false;
    setLoading(true);
    void searchClubsByText(supabase, user?.id, q)
      .then((data) => {
        if (!cancelled) setClubs(data);
      })
      .catch(() => {
        if (!cancelled) setClubs([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [q, isLikelyCode, user?.id]);

  if (loading && clubs.length === 0) {
    return (
      <div className="divide-y divide-border">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3">
            <Skeleton className="h-12 w-12 shrink-0 rounded-ios-lg" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-9 w-20 shrink-0 rounded-lg" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {!q && (
        <div className="space-y-3 px-ios-4 pt-ios-3">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 shrink-0 text-muted-foreground" />
            <Popover open={departmentSearchOpen} onOpenChange={setDepartmentSearchOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={departmentSearchOpen}
                  className="ios-surface w-full justify-between rounded-ios-md"
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
          {clubs.length > 0 && (
            <p className="text-sm text-muted-foreground">
              Clubs publics
              {selectedDepartment ? ` · ${selectedDepartment.split(" - ")[0]}` : ""}
            </p>
          )}
        </div>
      )}

      {isLikelyCode && (
        <div className="px-ios-4 pt-ios-3">
          <p className="text-sm text-muted-foreground">
            Code club : <span className="font-mono font-semibold text-foreground">{codeQuery}</span>
          </p>
        </div>
      )}

      {!loading && clubs.length === 0 && (
        <div className="flex flex-col items-center px-6 py-12 text-center">
          <Users className="mb-4 h-14 w-14 text-muted-foreground/70" />
          <h3 className="mb-2 text-[17px] font-semibold">
            {isLikelyCode ? "Aucun club" : q.length >= 2 ? "Aucun club" : "Aucun club public"}
          </h3>
          <p className="max-w-sm text-sm text-muted-foreground">
            {isLikelyCode
              ? `Pas de club avec le code « ${codeQuery} ».`
              : q.length >= 2
                ? `Aucun résultat pour « ${q} ».`
                : selectedDepartment
                  ? `Rien dans ce département (${selectedDepartment.split(" - ")[0]}).`
                  : "Saisis un nom de club, un code ou parcours les clubs publics ci-dessous."}
          </p>
        </div>
      )}

      <div className="divide-y divide-border">
        {!loading && clubs.map((club) => <ClubResultRow key={club.id} club={club} />)}
      </div>
    </div>
  );
};
