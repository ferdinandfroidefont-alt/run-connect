import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FileText, Plus, Trash2 } from "lucide-react";
import { CoachingFullscreenHeader } from "./CoachingFullscreenHeader";
import { IosFixedPageHeaderShell } from "@/components/layout/IosFixedPageHeaderShell";
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
      .eq("club_id", clubId)
      .eq("coach_id", user.id)
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
      <DialogContent fullScreen hideCloseButton className="flex min-h-0 flex-col gap-0 overflow-hidden p-0">
        <IosFixedPageHeaderShell
          className="min-h-0 flex-1"
          headerWrapperClassName="shrink-0"
          header={<CoachingFullscreenHeader title="Brouillons" onBack={onClose} />}
          scrollClassName="space-y-3 bg-secondary px-4 py-4"
        >
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="ios-card h-16 animate-pulse border border-border/60" />
              ))}
            </div>
          ) : drafts.length === 0 ? (
            <div className="ios-card border border-border/60 px-4 py-12 text-center text-muted-foreground shadow-[var(--shadow-card)]">
              <FileText className="mx-auto mb-3 h-10 w-10 opacity-40" />
              <p className="text-[15px]">Aucun brouillon</p>
              <p className="mt-1 text-[13px]">Créez un plan hebdo pour commencer</p>
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
                  className="ios-card flex items-center gap-3 border border-border/60 px-4 py-3 shadow-[var(--shadow-card)] transition-transform active:scale-[0.99]"
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
                        <span className="rounded-full bg-primary/12 px-2 py-0.5 text-[10px] font-medium text-primary">
                          Envoyé
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
            className="ios-card flex w-full items-center justify-center gap-2 border border-dashed border-primary/35 px-4 py-3 text-[15px] font-medium text-primary transition-transform active:scale-[0.99]"
          >
            <Plus className="h-4 w-4" />
            Nouveau plan hebdo
          </button>
        </IosFixedPageHeaderShell>
      </DialogContent>
    </Dialog>
  );
};
