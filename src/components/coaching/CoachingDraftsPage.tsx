import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { FileText, Trash2 } from "lucide-react";
import { format, formatDistanceToNow, parseISO } from "date-fns";
import { fr } from "date-fns/locale";

interface Draft {
  id: string;
  week_start: string;
  group_id: string;
  sessions: unknown[];
  target_athletes?: string[];
  sent_at: string | null;
  updated_at: string;
}

export type CoachingDraftListItem = Draft;

interface CoachingDraftsPageProps {
  clubId: string;
  onOpenDraft: (draft: CoachingDraftListItem) => void | Promise<void>;
}

export function CoachingDraftsPage({ clubId, onOpenDraft }: CoachingDraftsPageProps) {
  const { user } = useAuth();
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!clubId || !user) return;
    let ignore = false;

    const load = async () => {
      setLoading(true);
      const [{ data: draftsData }, { data: groupsData }] = await Promise.all([
        supabase
          .from("coaching_drafts")
          .select("*")
          .eq("club_id", clubId)
          .eq("coach_id", user.id)
          .order("week_start", { ascending: false }),
        supabase.from("club_groups").select("id, name").eq("club_id", clubId),
      ]);

      if (ignore) return;
      setDrafts((draftsData as Draft[]) || []);
      const map: Record<string, string> = {};
      (groupsData || []).forEach((group) => {
        map[group.id] = group.name;
      });
      setGroups(map);
      setLoading(false);
    };

    void load();
    return () => {
      ignore = true;
    };
  }, [clubId, user]);

  const hasDrafts = useMemo(() => drafts.length > 0, [drafts]);

  const deleteDraft = async (id: string) => {
    await supabase.from("coaching_drafts").delete().eq("id", id);
    setDrafts((prev) => prev.filter((d) => d.id !== id));
  };

  return (
    <div className="space-y-3 bg-secondary px-4 py-4">
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="ios-card h-16 animate-pulse border border-border/60" />
          ))}
        </div>
      ) : !hasDrafts ? (
        <div className="ios-card border border-border/60 px-4 py-12 text-center text-muted-foreground shadow-[var(--shadow-card)]">
          <FileText className="mx-auto mb-3 h-10 w-10 opacity-40" />
          <p className="text-[15px]">Aucun brouillon</p>
          <p className="mt-1 text-[13px]">Créez un plan hebdo pour commencer</p>
        </div>
      ) : (
        drafts.map((draft) => {
          const sessionsArr = Array.isArray(draft.sessions) ? draft.sessions : [];
          const groupLabel = draft.group_id === "club" ? "Club" : groups[draft.group_id] || "Groupe";
          const weekLabel = format(parseISO(draft.week_start), "d MMM yyyy", { locale: fr });
          const timeAgo = formatDistanceToNow(new Date(draft.updated_at), { addSuffix: true, locale: fr });

          return (
            <div
              key={draft.id}
              className="ios-card flex items-center gap-3 border border-border/60 px-4 py-3 shadow-[var(--shadow-card)] transition-transform active:scale-[0.99]"
            >
              <button onClick={() => void onOpenDraft(draft)} className="flex-1 text-left">
                <div className="flex items-center gap-2">
                  <span className="text-[15px] font-medium text-foreground">Sem. {weekLabel}</span>
                  {draft.sent_at ? (
                    <span className="rounded-full bg-primary/12 px-2 py-0.5 text-[10px] font-medium text-primary">Envoyé</span>
                  ) : null}
                </div>
                <p className="mt-0.5 text-[13px] text-muted-foreground">
                  {groupLabel} · {sessionsArr.length} séance{sessionsArr.length > 1 ? "s" : ""} · {timeAgo}
                </p>
              </button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  void deleteDraft(draft.id);
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          );
        })
      )}
    </div>
  );
}
