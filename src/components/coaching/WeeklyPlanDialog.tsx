import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { WeeklyPlanSessionEditor, type WeekSession } from "./WeeklyPlanSessionEditor";
import { ChevronLeft, ChevronRight, Plus, Send, Loader2 } from "lucide-react";
import { format, startOfWeek, addWeeks, subWeeks, addDays } from "date-fns";
import { fr } from "date-fns/locale";
import { parseRCC, rccToSessionBlocks } from "@/lib/rccParser";

const DAY_LABELS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

interface ClubMember {
  user_id: string;
  display_name: string;
}

interface ClubGroup {
  id: string;
  name: string;
  color: string;
  memberIds: string[];
}

interface WeeklyPlanDialogProps {
  isOpen: boolean;
  onClose: () => void;
  clubId: string;
  onSent?: () => void;
}

const createEmptySession = (dayIndex: number): WeekSession => ({
  dayIndex,
  activityType: "running",
  objective: "",
  rccCode: "",
  parsedBlocks: [],
  coachNotes: "",
  locationName: "",
  athleteOverrides: {},
});

type SendTarget = "club" | "selection" | string; // string = group ID

export const WeeklyPlanDialog = ({ isOpen, onClose, clubId, onSent }: WeeklyPlanDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [sessions, setSessions] = useState<WeekSession[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [members, setMembers] = useState<ClubMember[]>([]);
  const [groups, setGroups] = useState<ClubGroup[]>([]);
  const [sending, setSending] = useState(false);
  const [sendTarget, setSendTarget] = useState<SendTarget>("club");

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });

  useEffect(() => {
    if (isOpen) {
      loadMembers();
      loadGroups();
    }
  }, [isOpen, clubId]);

  const loadMembers = async () => {
    const { data } = await supabase
      .from("group_members")
      .select("user_id")
      .eq("conversation_id", clubId);

    if (data && data.length > 0) {
      const userIds = data.map(d => d.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name")
        .in("user_id", userIds);

      setMembers(
        (profiles || [])
          .filter(p => p.user_id !== user?.id)
          .map(p => ({ user_id: p.user_id!, display_name: p.display_name || "Athlète" }))
      );
    }
  };

  const loadGroups = async () => {
    const { data: groupsData } = await supabase
      .from("club_groups")
      .select("id, name, color")
      .eq("club_id", clubId);

    if (groupsData && groupsData.length > 0) {
      const { data: memberships } = await supabase
        .from("club_group_members")
        .select("group_id, user_id")
        .in("group_id", groupsData.map(g => g.id));

      const memberMap: Record<string, string[]> = {};
      (memberships || []).forEach(m => {
        if (!memberMap[m.group_id]) memberMap[m.group_id] = [];
        memberMap[m.group_id].push(m.user_id);
      });

      setGroups(groupsData.map(g => ({ ...g, memberIds: memberMap[g.id] || [] })));
    } else {
      setGroups([]);
    }
  };

  const sessionsByDay = useMemo(() => {
    const map: Record<number, number[]> = {};
    sessions.forEach((s, i) => {
      if (!map[s.dayIndex]) map[s.dayIndex] = [];
      map[s.dayIndex].push(i);
    });
    return map;
  }, [sessions]);

  const addSession = (dayIndex: number) => {
    const newSession = createEmptySession(dayIndex);
    setSessions(prev => [...prev, newSession]);
    setSelectedIndex(sessions.length);
  };

  const updateSession = (index: number, updated: WeekSession) => {
    setSessions(prev => prev.map((s, i) => (i === index ? updated : s)));
  };

  const deleteSession = (index: number) => {
    setSessions(prev => prev.filter((_, i) => i !== index));
    setSelectedIndex(null);
  };

  const duplicateToDay = (sourceIndex: number, targetDay: number) => {
    const source = sessions[sourceIndex];
    const dup: WeekSession = { ...source, dayIndex: targetDay, athleteOverrides: { ...source.athleteOverrides } };
    setSessions(prev => [...prev, dup]);
    toast({ title: `Séance dupliquée vers ${DAY_LABELS[targetDay]}` });
  };

  const handleSendPlan = async () => {
    if (!user || sessions.length === 0) return;
    setSending(true);

    try {
      for (const session of sessions) {
        const scheduledDate = addDays(weekStart, session.dayIndex);
        scheduledDate.setHours(8, 0, 0, 0);

        const { blocks } = parseRCC(session.rccCode);
        const sessionBlocks = rccToSessionBlocks(blocks);

        const { data: created, error } = await supabase
          .from("coaching_sessions")
          .insert({
            club_id: clubId,
            coach_id: user.id,
            title: session.objective || `Séance ${DAY_LABELS[session.dayIndex]}`,
            description: session.coachNotes || null,
            activity_type: session.activityType,
            scheduled_at: scheduledDate.toISOString(),
            rcc_code: session.rccCode || null,
            objective: session.objective || null,
            coach_notes: session.coachNotes || null,
            session_blocks: sessionBlocks.length > 0 ? sessionBlocks : null,
            default_location_name: session.locationName || null,
            send_mode: sendTarget === "club" ? "club" : sendTarget === "selection" ? "selection" : "group",
            target_athletes: sendTarget === "selection"
              ? Object.keys(session.athleteOverrides)
              : [],
            target_group_id: sendTarget !== "club" && sendTarget !== "selection" ? sendTarget : null,
          })
          .select("id")
          .single();

        if (error) throw error;

        // Resolve target members based on sendTarget
        let targetMembers: ClubMember[];
        if (sendTarget === "selection") {
          targetMembers = members.filter(m => session.athleteOverrides[m.user_id]);
        } else if (sendTarget === "club") {
          targetMembers = members;
        } else {
          // Group
          const group = groups.find(g => g.id === sendTarget);
          targetMembers = group ? members.filter(m => group.memberIds.includes(m.user_id)) : members;
        }

        if (created && targetMembers.length > 0) {
          const participations = targetMembers.map(m => ({
            coaching_session_id: created.id,
            user_id: m.user_id,
            status: "sent",
            athlete_overrides: JSON.parse(JSON.stringify(session.athleteOverrides[m.user_id] || {})),
          }));

          await supabase.from("coaching_participations").insert(participations);
        }
      }

      const targetLabel = sendTarget === "club" ? `${members.length} athlètes` : sendTarget === "selection" ? "sélection" : groups.find(g => g.id === sendTarget)?.name || "groupe";
      toast({ title: "Plan envoyé !", description: `${sessions.length} séances → ${targetLabel}` });
      setSessions([]);
      setSelectedIndex(null);
      onSent?.();
      onClose();
    } catch (error) {
      console.error("Error sending plan:", error);
      toast({ title: "Erreur", description: "Impossible d'envoyer le plan", variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const selectedSession = selectedIndex !== null ? sessions[selectedIndex] : null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent fullScreen hideCloseButton className="flex flex-col">
        {/* Header */}
        <DialogHeader className="sticky top-0 bg-background z-10 border-b p-4 shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 -ml-2">
              <ChevronLeft className="h-5 w-5" />
            </Button>
            Plan de semaine
          </DialogTitle>
          <div className="flex items-center justify-center gap-2 mt-2">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setCurrentWeek(subWeeks(currentWeek, 1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-xs font-medium">
              Sem. {format(weekStart, "d MMM yyyy", { locale: fr })}
            </span>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        {/* Week grid */}
        <div className="shrink-0 px-4 pt-3">
          <div className="grid grid-cols-7 gap-1">
            {DAY_LABELS.map((label, dayIndex) => {
              const daySessions = sessionsByDay[dayIndex] || [];
              return (
                <div key={dayIndex} className="flex flex-col items-center gap-1">
                  <span className="text-[10px] font-medium text-muted-foreground uppercase">{label}</span>
                  {daySessions.map(sIdx => (
                    <button
                      key={sIdx}
                      onClick={() => setSelectedIndex(sIdx)}
                      className={`w-full px-1 py-0.5 rounded text-[10px] font-medium truncate transition-colors ${
                        selectedIndex === sIdx
                          ? "bg-primary text-primary-foreground"
                          : "bg-accent text-accent-foreground hover:bg-accent/80"
                      }`}
                    >
                      {sessions[sIdx].objective || "—"}
                    </button>
                  ))}
                  <button
                    onClick={() => addSession(dayIndex)}
                    className="w-full py-0.5 rounded border border-dashed text-[10px] text-muted-foreground hover:bg-muted transition-colors"
                  >
                    <Plus className="h-3 w-3 mx-auto" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Editor */}
        <div className="flex-1 overflow-y-auto px-4 py-3">
          {selectedSession && selectedIndex !== null ? (
            <WeeklyPlanSessionEditor
              session={selectedSession}
              onChange={s => updateSession(selectedIndex, s)}
              onDuplicate={targetDay => duplicateToDay(selectedIndex, targetDay)}
              onDelete={() => deleteSession(selectedIndex)}
              members={members}
            />
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-sm">Cliquez sur <strong>+</strong> pour ajouter une séance</p>
              <p className="text-xs mt-1">ou sélectionnez une séance existante</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 border-t p-4 space-y-3 bg-background">
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant={sendTarget === "club" ? "default" : "outline"}
              size="sm"
              className="text-xs h-7"
              onClick={() => setSendTarget("club")}
            >
              Tout le club
            </Button>
            {groups.map(g => (
              <Button
                key={g.id}
                variant={sendTarget === g.id ? "default" : "outline"}
                size="sm"
                className="text-xs h-7"
                onClick={() => setSendTarget(g.id)}
              >
                <div className="w-2 h-2 rounded-full mr-1" style={{ backgroundColor: g.color }} />
                {g.name}
              </Button>
            ))}
            <Button
              variant={sendTarget === "selection" ? "default" : "outline"}
              size="sm"
              className="text-xs h-7"
              onClick={() => setSendTarget("selection")}
            >
              Sélection
            </Button>
            {sessions.length > 0 && (
              <Badge variant="secondary" className="text-[10px] ml-auto">
                {sessions.length} séance{sessions.length > 1 ? "s" : ""} → {
                  sendTarget === "club" ? members.length :
                  sendTarget === "selection" ? "sélection" :
                  `${groups.find(g => g.id === sendTarget)?.name} (${groups.find(g => g.id === sendTarget)?.memberIds.length || 0})`
                } athlètes
              </Badge>
            )}
          </div>

          <Button
            className="w-full"
            onClick={handleSendPlan}
            disabled={sessions.length === 0 || sending}
          >
            {sending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Send className="h-4 w-4 mr-2" />
            )}
            Envoyer le plan
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
