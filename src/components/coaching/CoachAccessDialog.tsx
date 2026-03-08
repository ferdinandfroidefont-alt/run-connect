import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GraduationCap, Plus, Users, ChevronLeft, Dumbbell, Sparkles } from "lucide-react";
import { IOSListGroup, IOSListItem } from "@/components/ui/ios-list-item";
import { AthleteWeeklyDialog } from "./AthleteWeeklyDialog";
import { startOfWeek, endOfWeek } from "date-fns";

interface CoachClub {
  conversation_id: string;
  group_name: string | null;
}

interface AthleteClub {
  clubId: string;
  clubName: string;
  completed: number;
  total: number;
}

interface CoachAccessDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectClub: (clubId: string) => void;
  onCreateClub: () => void;
}

export const CoachAccessDialog = ({
  isOpen,
  onClose,
  onSelectClub,
  onCreateClub,
}: CoachAccessDialogProps) => {
  const { user } = useAuth();
  const [clubs, setClubs] = useState<CoachClub[]>([]);
  const [athleteClubs, setAthleteClubs] = useState<AthleteClub[]>([]);
  const [loadingCoach, setLoadingCoach] = useState(true);
  const [loadingAthlete, setLoadingAthlete] = useState(true);
  const [openCoachingClubId, setOpenCoachingClubId] = useState<string | null>(null);
  const [totalAthletes, setTotalAthletes] = useState(0);

  const loading = loadingCoach || loadingAthlete;

  useEffect(() => {
    if (isOpen && user) {
      loadCoachClubs();
      loadAthleteClubs();
    }
  }, [isOpen, user]);

  const loadCoachClubs = async () => {
    if (!user) return;
    setLoadingCoach(true);
    try {
      const { data: memberships } = await supabase
        .from("group_members")
        .select("conversation_id, is_coach")
        .eq("user_id", user.id)
        .eq("is_coach", true);

      const clubIds = (memberships || []).map((m) => m.conversation_id);
      if (clubIds.length > 0) {
        const { data: convs } = await supabase
          .from("conversations")
          .select("id, group_name")
          .in("id", clubIds)
          .eq("is_group", true);

        setClubs(
          (convs || []).map((c) => ({ conversation_id: c.id, group_name: c.group_name }))
        );

        // Count total athletes across all clubs
        const { count } = await supabase
          .from("group_members")
          .select("id", { count: "exact", head: true })
          .in("conversation_id", clubIds)
          .eq("is_coach", false);
        setTotalAthletes(count || 0);
      } else {
        setClubs([]);
        setTotalAthletes(0);
      }
    } catch (error) {
      console.error("Error loading coach clubs:", error);
    } finally {
      setLoadingCoach(false);
    }
  };

  const loadAthleteClubs = async () => {
    if (!user) return;
    setLoadingAthlete(true);
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: participations } = await supabase
        .from("coaching_participations")
        .select("coaching_session_id, status")
        .eq("user_id", user.id);

      if (!participations || participations.length === 0) {
        setAthleteClubs([]);
        setLoadingAthlete(false);
        return;
      }

      const sessionIds = participations.map(p => p.coaching_session_id);
      const { data: sessions } = await supabase
        .from("coaching_sessions")
        .select("id, club_id, scheduled_at")
        .in("id", sessionIds)
        .gte("scheduled_at", thirtyDaysAgo.toISOString());

      if (!sessions || sessions.length === 0) {
        setAthleteClubs([]);
        setLoadingAthlete(false);
        return;
      }

      const clubMap = new Map<string, { sessionIds: string[] }>();
      sessions.forEach(s => {
        if (!clubMap.has(s.club_id)) clubMap.set(s.club_id, { sessionIds: [] });
        clubMap.get(s.club_id)!.sessionIds.push(s.id);
      });

      const clubIds = [...clubMap.keys()];
      const { data: conversations } = await supabase
        .from("conversations")
        .select("id, group_name")
        .in("id", clubIds);

      const wStart = startOfWeek(new Date(), { weekStartsOn: 1 });
      const wEnd = endOfWeek(new Date(), { weekStartsOn: 1 });

      const result = clubIds.map(clubId => {
        const conv = conversations?.find(c => c.id === clubId);
        const clubSessions = sessions.filter(s => s.club_id === clubId);
        const thisWeekSessionIds = clubSessions
          .filter(s => {
            const d = new Date(s.scheduled_at);
            return d >= wStart && d <= wEnd;
          })
          .map(s => s.id);

        const completedThisWeek = participations.filter(
          p => thisWeekSessionIds.includes(p.coaching_session_id) && p.status === "completed"
        ).length;

        return {
          clubId,
          clubName: conv?.group_name || "Club",
          completed: completedThisWeek,
          total: thisWeekSessionIds.length,
        };
      });

      setAthleteClubs(result);
    } catch (e) {
      console.error("Error loading athlete clubs:", e);
    } finally {
      setLoadingAthlete(false);
    }
  };

  const hasContent = clubs.length > 0 || athleteClubs.length > 0;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent fullScreen hideCloseButton>
          <DialogHeader className="sticky top-0 bg-background z-10 border-b p-4">
            <DialogTitle className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 -ml-2">
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <GraduationCap className="h-5 w-5" />
              Mode Coach
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto bg-secondary px-0">
            {/* Hero Section */}
            <div className="bg-gradient-to-br from-primary/20 via-primary/10 to-transparent px-6 py-8 text-center">
              <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-primary/15 mb-4">
                <GraduationCap className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-[22px] font-bold text-foreground mb-1">Mode Coach</h2>
              {hasContent ? (
                <div className="flex items-center justify-center gap-3 mt-2">
                  <Badge className="bg-primary/10 text-primary border-0 rounded-lg px-3 py-1 text-[13px] font-semibold">
                    {clubs.length} club{clubs.length > 1 ? "s" : ""}
                  </Badge>
                  {totalAthletes > 0 && (
                    <Badge className="bg-primary/10 text-primary border-0 rounded-lg px-3 py-1 text-[13px] font-semibold">
                      {totalAthletes} athlète{totalAthletes > 1 ? "s" : ""}
                    </Badge>
                  )}
                </div>
              ) : (
                <p className="text-[14px] text-muted-foreground mt-1">
                  Planifiez et suivez l'entraînement de vos athlètes
                </p>
              )}
              <Badge className="mt-3 bg-amber-500/15 text-amber-600 border-0 rounded-full px-3 py-1 text-[11px] font-bold gap-1">
                <Sparkles className="h-3 w-3" />
                PRO
              </Badge>
            </div>

            {loading ? (
              <div className="p-4 space-y-2">
                {[1, 2].map((i) => (
                  <div key={i} className="h-12 bg-card rounded-xl animate-pulse" />
                ))}
              </div>
            ) : (
              <>
                {/* Coach clubs */}
                {clubs.length > 0 && (
                  <div className="pt-4">
                    <IOSListGroup header="MES CLUBS (COACH)" flush>
                      {clubs.map((club, i) => (
                        <IOSListItem
                          key={club.conversation_id}
                          icon={GraduationCap}
                          iconBgColor="bg-primary"
                          title={club.group_name || "Club"}
                          subtitle="Gérer les entraînements"
                          onClick={() => {
                            onSelectClub(club.conversation_id);
                            onClose();
                          }}
                          showSeparator={i < clubs.length - 1}
                        />
                      ))}
                    </IOSListGroup>
                  </div>
                )}

                {/* Athlete coaching plans */}
                {athleteClubs.length > 0 && (
                  <div>
                    <IOSListGroup header="MON PLAN COACHING" flush>
                      {athleteClubs.map((club, i) => {
                        const pct = club.total > 0 ? Math.round((club.completed / club.total) * 100) : 0;
                        return (
                          <IOSListItem
                            key={club.clubId}
                            icon={Dumbbell}
                            iconBgColor="bg-orange-500"
                            title="Mon plan coaching"
                            subtitle={`${club.clubName} · ${club.completed}/${club.total} cette semaine`}
                            rightElement={
                              club.total > 0 ? (
                                <Badge
                                  className={`text-[11px] px-2 py-0.5 rounded-lg border-0 ${
                                    pct >= 80 ? "bg-green-500/15 text-green-600" :
                                    pct >= 50 ? "bg-orange-500/15 text-orange-600" :
                                    "bg-red-500/15 text-red-600"
                                  }`}
                                >
                                  {pct}%
                                </Badge>
                              ) : undefined
                            }
                            onClick={() => setOpenCoachingClubId(club.clubId)}
                            showSeparator={i < athleteClubs.length - 1}
                          />
                        );
                      })}
                    </IOSListGroup>
                  </div>
                )}

                {/* Empty state */}
                {!hasContent && (
                  <div className="text-center py-10 px-6">
                    <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-muted mb-4">
                      <Users className="h-7 w-7 text-muted-foreground/50" />
                    </div>
                    <p className="text-[16px] font-semibold text-foreground mb-1">
                      Créez votre premier club
                    </p>
                    <p className="text-[13px] text-muted-foreground mb-4 max-w-[260px] mx-auto">
                      Commencez à planifier des entraînements pour vos athlètes
                    </p>
                    <Button
                      onClick={() => {
                        onClose();
                        onCreateClub();
                      }}
                      className="rounded-2xl h-11 px-6 text-[14px] font-semibold gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Créer un club
                    </Button>
                  </div>
                )}

                {/* Create club button for coaches */}
                {clubs.length > 0 && (
                  <div className="pb-4">
                    <IOSListGroup flush>
                      <IOSListItem
                        icon={Plus}
                        iconBgColor="bg-green-500"
                        title="Créer un club"
                        onClick={() => {
                          onClose();
                          onCreateClub();
                        }}
                        showSeparator={false}
                      />
                    </IOSListGroup>
                  </div>
                )}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Athlete Weekly Dialog */}
      {openCoachingClubId && (
        <AthleteWeeklyDialog
          isOpen={!!openCoachingClubId}
          onClose={() => setOpenCoachingClubId(null)}
          clubId={openCoachingClubId}
          clubName={athleteClubs.find(c => c.clubId === openCoachingClubId)?.clubName || "Club"}
        />
      )}
    </>
  );
};
