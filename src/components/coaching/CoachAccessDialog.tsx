import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { GraduationCap, Plus, Users } from "lucide-react";

interface CoachClub {
  conversation_id: string;
  group_name: string | null;
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && user) loadCoachClubs();
  }, [isOpen, user]);

  const loadCoachClubs = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: memberships } = await supabase
        .from("group_members")
        .select("conversation_id, is_coach")
        .eq("user_id", user.id)
        .eq("is_coach", true);

      if (memberships && memberships.length > 0) {
        const clubIds = memberships.map((m) => m.conversation_id);
        const { data: convs } = await supabase
          .from("conversations")
          .select("id, group_name")
          .in("id", clubIds)
          .eq("is_group", true);

        setClubs(
          (convs || []).map((c) => ({ conversation_id: c.id, group_name: c.group_name }))
        );
      } else {
        // Check if user created any clubs (creator = coach by default)
        const { data: createdClubs } = await supabase
          .from("conversations")
          .select("id, group_name")
          .eq("created_by", user.id)
          .eq("is_group", true);

        setClubs(
          (createdClubs || []).map((c) => ({ conversation_id: c.id, group_name: c.group_name }))
        );
      }
    } catch (error) {
      console.error("Error loading coach clubs:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5" />
            Mode Coach
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {loading ? (
            <div className="space-y-2">
              {[1, 2].map((i) => (
                <div key={i} className="h-12 bg-muted rounded-lg animate-pulse" />
              ))}
            </div>
          ) : clubs.length === 0 ? (
            <div className="text-center py-4">
              <Users className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-50" />
              <p className="text-sm text-muted-foreground mb-3">
                Vous n'êtes coach dans aucun club
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
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                Choisissez le club pour publier un plan :
              </p>
              {clubs.map((club) => (
                <button
                  key={club.conversation_id}
                  onClick={() => {
                    onSelectClub(club.conversation_id);
                    onClose();
                  }}
                  className="w-full text-left p-3 rounded-lg border hover:bg-muted/50 transition-colors flex items-center gap-3"
                >
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <GraduationCap className="h-5 w-5 text-primary" />
                  </div>
                  <span className="font-medium text-sm">{club.group_name || "Club"}</span>
                </button>
              ))}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
