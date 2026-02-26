import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileText, Plus, Trash2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { formatDistanceToNow } from "date-fns";

interface Draft {
  id: string;
  week_start: string;
  group_id: string;
  sessions: any[];
  target_athletes: string[];
  sent_at: string | null;
  updated_at: string;
}

interface CoachingDraftsListProps {
  isOpen: boolean;
  onClose: () => void;
  clubId: string;
  onOpenDraft: (weekStart: Date, groupId: string) => void;
}

export const CoachingDraftsList = ({ isOpen, onClose, clubId, onOpenDraft }: CoachingDraftsListProps) => {
  const { user } = useAuth();
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen && user) {
      loadDrafts();
      loadGroups();
    }
  }, [isOpen, user, clubId]);

  const loadDrafts = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("coaching_drafts" as any)
      .select("*")
      .eq("coach_id", user.id)
      .eq("club_id", clubId)
      .order("week_start", { ascending: false });
    setDrafts((data as any) || []);
    setLoading(false);
  };

  const loadGroups = async () => {
    const { data } = await supabase
      .from("club_groups")
      .select("id, name")
      .eq("club_id", clubId);
    const map: Record<string, string> = {};
    (data || []).forEach(g => { map[g.id] = g.name; });
    setGroups(map);
  };

  const deleteDraft = async (id: string) => {
    await supabase.from("coaching_drafts" as any).delete().eq("id", id);
    setDrafts(prev => prev.filter(d => d.id !== id));
  };

  const handleOpenDraft = (draft: Draft) => {
    onOpenDraft(parseISO(draft.week_start), draft.group_id);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent fullScreen hideCloseButton className="flex flex-col p-0 gap-0">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-card border-b border-border px-4 py-3 flex items-center shrink-0">
          <button onClick={onClose} className="flex items-center gap-0.5 text-primary text-[17px] min-w-[70px]">
            <ArrowLeft className="h-5 w-5" />
            <span className="text-[15px]">Retour</span>
          </button>
          <span className="flex-1 text-center text-[17px] font-semibold text-foreground">Brouillons</span>
          <div className="min-w-[70px]" />
        </div>

        <div className="flex-1 overflow-y-auto bg-secondary py-4 space-y-2">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <div key={i} className="h-16 bg-card rounded-[10px] animate-pulse" />)}
            </div>
          ) : drafts.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p className="text-[15px]">Aucun brouillon</p>
              <p className="text-[13px] mt-1">Créez un plan hebdo pour commencer</p>
            </div>
          ) : (
            drafts.map(draft => {
              const sessionsArr = Array.isArray(draft.sessions) ? draft.sessions : [];
              const groupLabel = draft.group_id === "club" ? "Club" : (groups[draft.group_id] || "Groupe");
              const weekLabel = format(parseISO(draft.week_start), "d MMM yyyy", { locale: fr });
              const timeAgo = formatDistanceToNow(new Date(draft.updated_at), { addSuffix: true, locale: fr });

              return (
                <div
                  key={draft.id}
                  className="bg-card rounded-[12px] px-4 py-3 flex items-center gap-3 active:scale-[0.98] transition-transform"
                  style={{ boxShadow: '0 1px 3px hsl(0 0% 0% / 0.06)' }}
                >
                  <button
                    onClick={() => handleOpenDraft(draft)}
                    className="flex-1 text-left"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-[15px] font-medium text-foreground">
                        Sem. {weekLabel}
                      </span>
                      {draft.sent_at && (
                        <span className="text-[10px] bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-1.5 py-0.5 rounded-full font-medium">
                          Envoyé ✓
                        </span>
                      )}
                    </div>
                    <p className="text-[13px] text-muted-foreground mt-0.5">
                      {groupLabel} · {sessionsArr.length} séance{sessionsArr.length > 1 ? "s" : ""} · {timeAgo}
                    </p>
                  </button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive shrink-0"
                    onClick={(e) => { e.stopPropagation(); deleteDraft(draft.id); }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              );
            })
          )}

          {/* New plan button */}
          <button
            onClick={() => {
              onOpenDraft(new Date(), "club");
              onClose();
            }}
            className="w-full bg-card rounded-[12px] px-4 py-3 flex items-center justify-center gap-2 text-primary text-[15px] font-medium active:scale-[0.98] transition-transform border border-dashed border-border"
          >
            <Plus className="h-4 w-4" />
            Nouveau plan hebdo
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
