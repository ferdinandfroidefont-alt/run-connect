import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { GraduationCap, Plus, Users, ChevronLeft, Dumbbell } from "lucide-react";
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
      } else {
        setClubs([]);
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
            {loading ? (
              <div className="p-4 space-y-2">
                {[1, 2].map((i) => (
                  <div key={i} className="h-12 bg-card rounded-none animate-pulse" />
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
                      {athleteClubs.map((club, i) => (
                        <IOSListItem
                          key={club.clubId}
                          icon={Dumbbell}
                          iconBgColor="bg-orange-500"
                          title="Mon plan coaching"
                          subtitle={`${club.clubName} · ${club.completed}/${club.total} cette semaine`}
                          onClick={() => setOpenCoachingClubId(club.clubId)}
                          showSeparator={i < athleteClubs.length - 1}
                        />
                      ))}
                    </IOSListGroup>
                  </div>
                )}

                {/* Empty state */}
                {clubs.length === 0 && athleteClubs.length === 0 && (
                  <div className="text-center py-8 px-4">
                    <Users className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-50" />
                    <p className="text-sm text-muted-foreground mb-3">
                      Aucun club ou programme d'entraînement
                    </p>
                    <Button
                      variant="outline"
                      onClick={() => {
                        onClose();
                        onCreateClub();
                      }}
                    >
                      <Plus className="h-4 w-4 mr-1" />
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
