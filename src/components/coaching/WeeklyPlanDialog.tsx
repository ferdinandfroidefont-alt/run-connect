import { useState, useEffect, useMemo, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { WeeklyPlanSessionEditor, type WeekSession } from "./WeeklyPlanSessionEditor";
import { AthleteOverrideEditor } from "./AthleteOverrideEditor";
import { IOSListGroup, IOSListItem } from "@/components/ui/ios-list-item";
import { ArrowLeft, ChevronLeft, ChevronRight, Plus, Send, Loader2, Copy, Save, FolderOpen, Trash2, X, Users, ChevronDown } from "lucide-react";
import { format, startOfWeek, addWeeks, subWeeks, addDays } from "date-fns";
import { fr } from "date-fns/locale";
import { parseRCC, rccToSessionBlocks } from "@/lib/rccParser";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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

interface WeekTemplate {
  id: string;
  name: string;
  sessions: WeekSession[];
}

interface WeeklyPlanDialogProps {
  isOpen: boolean;
  onClose: () => void;
  clubId: string;
  onSent?: () => void;
}

type GroupPlans = Record<string, WeekSession[]>;

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

export const WeeklyPlanDialog = ({ isOpen, onClose, clubId, onSent }: WeeklyPlanDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [groupPlans, setGroupPlans] = useState<GroupPlans>({});
  const [activeGroupId, setActiveGroupId] = useState<string>("club");
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [members, setMembers] = useState<ClubMember[]>([]);
  const [groups, setGroups] = useState<ClubGroup[]>([]);
  const [sending, setSending] = useState(false);
  const [templates, setTemplates] = useState<WeekTemplate[]>([]);
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);
  const [templateName, setTemplateName] = useState("");

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
  const sessions = groupPlans[activeGroupId] || [];

  const setSessions = useCallback((updater: (prev: WeekSession[]) => WeekSession[]) => {
    setGroupPlans(prev => ({
      ...prev,
      [activeGroupId]: updater(prev[activeGroupId] || []),
    }));
  }, [activeGroupId]);

  useEffect(() => {
    if (isOpen) {
      loadMembers();
      loadGroups();
      loadTemplates();
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

  const loadTemplates = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("coaching_week_templates")
      .select("id, name, sessions")
      .eq("coach_id", user.id)
      .order("created_at", { ascending: false });
    if (data) {
      setTemplates(data.map(t => ({
        id: t.id,
        name: t.name,
        sessions: (t.sessions as any) || [],
      })));
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

  // ── Duplicate entire plan to another group ──
  const duplicatePlanToGroup = (targetGroupId: string) => {
    const currentSessions = groupPlans[activeGroupId] || [];
    if (currentSessions.length === 0) return;
    const cloned = currentSessions.map(s => ({
      ...s,
      athleteOverrides: {},
    }));
    setGroupPlans(prev => ({
      ...prev,
      [targetGroupId]: [...(prev[targetGroupId] || []), ...cloned],
    }));
    setActiveGroupId(targetGroupId);
    setSelectedIndex(null);
    const targetName = targetGroupId === "club"
      ? "Tout le club"
      : groups.find(g => g.id === targetGroupId)?.name || "Groupe";
    toast({ title: `Plan dupliqué vers ${targetName}`, description: `${cloned.length} séances copiées` });
  };

  // ── Templates ──
  const saveAsTemplate = async () => {
    if (!user || !templateName.trim() || sessions.length === 0) return;
    const stripped = sessions.map(({ athleteOverrides, parsedBlocks, ...rest }) => rest);
    const { error } = await supabase.from("coaching_week_templates").insert({
      coach_id: user.id,
      name: templateName.trim(),
      sessions: stripped as any,
    });
    if (!error) {
      toast({ title: "Semaine type sauvegardée !" });
      setShowSaveTemplate(false);
      setTemplateName("");
      loadTemplates();
    }
  };

  const loadTemplate = (template: WeekTemplate) => {
    const restored: WeekSession[] = template.sessions.map(s => ({
      ...s,
      parsedBlocks: s.parsedBlocks || [],
      athleteOverrides: s.athleteOverrides || {},
    }));
    setSessions(() => restored);
    setSelectedIndex(null);
    toast({ title: `"${template.name}" chargé`, description: `${restored.length} séances` });
  };

  const deleteTemplate = async (id: string) => {
    await supabase.from("coaching_week_templates").delete().eq("id", id);
    loadTemplates();
    toast({ title: "Semaine type supprimée" });
  };

  // ── Resolve target members for a group ──
  const getMembersForGroup = (groupId: string): ClubMember[] => {
    if (groupId === "club") return members;
    const group = groups.find(g => g.id === groupId);
    return group ? members.filter(m => group.memberIds.includes(m.user_id)) : members;
  };

  // ── Count total sessions across all groups ──
  const totalSessionsCount = useMemo(() => {
    return Object.values(groupPlans).reduce((sum, s) => sum + s.length, 0);
  }, [groupPlans]);

  const groupsWithPlans = useMemo(() => {
    return Object.entries(groupPlans)
      .filter(([, s]) => s.length > 0)
      .map(([id]) => id);
  }, [groupPlans]);

  // ── Send all group plans ──
  const handleSendPlan = async () => {
    if (!user || totalSessionsCount === 0) return;
    setSending(true);
    try {
      for (const [groupId, groupSessions] of Object.entries(groupPlans)) {
        if (groupSessions.length === 0) continue;
        const targetMembers = getMembersForGroup(groupId);
        const sendMode = groupId === "club" ? "club" : "group";
        const targetGroupDbId = groupId !== "club" ? groupId : null;

        for (const session of groupSessions) {
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
              send_mode: sendMode,
              target_athletes: [],
              target_group_id: targetGroupDbId,
            })
            .select("id")
            .single();

          if (error) throw error;

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
      }

      const groupLabels = groupsWithPlans.map(id =>
        id === "club" ? "Club" : groups.find(g => g.id === id)?.name || "Groupe"
      );
      toast({
        title: "Plan envoyé ! 🚀",
        description: `${totalSessionsCount} séances → ${groupLabels.join(", ")}`,
      });
      setGroupPlans({});
      setSelectedIndex(null);
      setActiveGroupId("club");
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

  // Groups available for duplication (excluding current)
  const otherGroups = useMemo(() => {
    const all = [{ id: "club", name: "Tout le club", color: "" }, ...groups];
    return all.filter(g => g.id !== activeGroupId);
  }, [groups, activeGroupId]);

  const activeGroupLabel = activeGroupId === "club"
    ? "Tout le club"
    : groups.find(g => g.id === activeGroupId)?.name || "Groupe";

  const activeGroupMemberCount = getMembersForGroup(activeGroupId).length;

  // ── Duplicate plan dropdown state ──
  const [showDupDropdown, setShowDupDropdown] = useState(false);
  const [showTemplateList, setShowTemplateList] = useState(false);
  const [showAthleteOverrides, setShowAthleteOverrides] = useState(false);

  // Get base values from the selected session for override defaults
  const selectedSessionIntervalBlock = selectedSession?.parsedBlocks?.find(b => b.type === "interval");
  const globalBasePace = selectedSessionIntervalBlock?.pace;
  const globalBaseReps = selectedSessionIntervalBlock?.repetitions;
  const globalBaseRecovery = selectedSessionIntervalBlock?.recoveryDuration;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent fullScreen hideCloseButton className="flex flex-col p-0 gap-0">
        {/* ── iOS Navigation Bar ── */}
        <div className="sticky top-0 z-10 bg-card border-b border-border px-4 py-3 flex items-center shrink-0">
          <button
            onClick={onClose}
            className="flex items-center gap-0.5 text-primary text-[17px] min-w-[70px]"
          >
            <ArrowLeft className="h-5 w-5" />
            <span className="text-[15px]">Retour</span>
          </button>
          <span className="flex-1 text-center text-[17px] font-semibold text-foreground">
            Plan de semaine
          </span>
          <div className="min-w-[70px]" />
        </div>

        {/* ── Scrollable body ── */}
        <div className="flex-1 overflow-y-auto bg-secondary pb-4">
          {/* ── GROUPE section ── */}
          <IOSListGroup header="GROUPE" className="mt-4 mx-4">
            <div className="px-4 py-3 bg-card">
              <Select value={activeGroupId} onValueChange={id => { setActiveGroupId(id); setSelectedIndex(null); }}>
                <SelectTrigger className="h-10 text-[15px] border-0 bg-transparent p-0 shadow-none">
                  <SelectValue placeholder="Choisir un groupe" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="club">🏟️ Tout le club ({members.length})</SelectItem>
                  {groups.map(g => (
                    <SelectItem key={g.id} value={g.id}>
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: g.color }} />
                        {g.name} ({g.memberIds.length})
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </IOSListGroup>

          {/* ── SEMAINE section ── */}
          <IOSListGroup header="SEMAINE" className="mx-4">
            <div className="px-4 py-3 bg-card flex items-center justify-between">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentWeek(subWeeks(currentWeek, 1))}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-[15px] font-medium text-foreground">
                Sem. {format(weekStart, "d MMM yyyy", { locale: fr })}
              </span>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            {/* Group pills */}
            {groupsWithPlans.length > 1 && (
              <div className="px-4 pb-3 bg-card flex items-center gap-1.5 flex-wrap border-t border-border">
                {groupsWithPlans.map(id => {
                  const g = id === "club" ? null : groups.find(g => g.id === id);
                  const count = (groupPlans[id] || []).length;
                  const isActive = id === activeGroupId;
                  return (
                    <button
                      key={id}
                      onClick={() => { setActiveGroupId(id); setSelectedIndex(null); }}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors mt-2 ${
                        isActive
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:bg-accent"
                      }`}
                    >
                      {g && <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: g.color }} />}
                      {g ? g.name : "Club"} ({count})
                    </button>
                  );
                })}
              </div>
            )}
          </IOSListGroup>

          {/* ── SÉANCES grid section ── */}
          <IOSListGroup header="SÉANCES" className="mx-4">
            <div className="px-3 py-3 bg-card">
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
                          className={`w-full px-1 py-0.5 rounded-md text-[10px] font-medium truncate transition-colors ${
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
                        className="w-full py-0.5 rounded-md border border-dashed border-border text-[10px] text-muted-foreground hover:bg-muted transition-colors"
                      >
                        <Plus className="h-3 w-3 mx-auto" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </IOSListGroup>

          {/* ── Éditeur de séance ── */}
          {selectedSession && selectedIndex !== null ? (
            <IOSListGroup className="mx-4">
              <WeeklyPlanSessionEditor
                session={selectedSession}
                onChange={s => updateSession(selectedIndex, s)}
                onDuplicate={targetDay => duplicateToDay(selectedIndex, targetDay)}
                onDelete={() => deleteSession(selectedIndex)}
                members={getMembersForGroup(activeGroupId)}
              />
            </IOSListGroup>
          ) : (
            <div className="text-center py-8 text-muted-foreground mx-4">
              <p className="text-[15px]">Cliquez sur <strong>+</strong> pour ajouter une séance</p>
              <p className="text-[13px] mt-1">ou sélectionnez une séance existante</p>
            </div>
          )}

          {/* ── ACTIONS section ── */}
          <IOSListGroup header="ACTIONS" className="mx-4">
            {templates.length > 0 && (
              <IOSListItem
                icon={FolderOpen}
                iconBgColor="bg-blue-500"
                title="Charger semaine type"
                subtitle={`${templates.length} template${templates.length > 1 ? "s" : ""} disponible${templates.length > 1 ? "s" : ""}`}
                onClick={() => setShowTemplateList(!showTemplateList)}
                showSeparator
              />
            )}
            {showTemplateList && templates.map(t => (
              <div key={t.id} className="flex items-center justify-between px-4 py-2.5 bg-card border-b border-border last:border-0">
                <button
                  onClick={() => { loadTemplate(t); setShowTemplateList(false); }}
                  className="text-[15px] text-primary flex-1 text-left"
                >
                  {t.name} ({t.sessions.length}s)
                </button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive"
                  onClick={() => deleteTemplate(t.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
            {sessions.length > 0 && otherGroups.length > 0 && (
              <>
                <IOSListItem
                  icon={Copy}
                  iconBgColor="bg-green-500"
                  title="Dupliquer vers un groupe"
                  subtitle={`${sessions.length} séance${sessions.length > 1 ? "s" : ""} à copier`}
                  onClick={() => setShowDupDropdown(!showDupDropdown)}
                  showSeparator
                />
                {showDupDropdown && otherGroups.map(g => (
                  <div key={g.id} className="px-4 py-2.5 bg-card border-b border-border last:border-0">
                    <button
                      onClick={() => { duplicatePlanToGroup(g.id); setShowDupDropdown(false); }}
                      className="text-[15px] text-primary flex items-center gap-2 w-full text-left"
                    >
                      {g.id !== "club" && (
                        <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: g.color }} />
                      )}
                      {g.name}
                    </button>
                  </div>
                ))}
              </>
            )}
            {sessions.length > 0 && (
              <IOSListItem
                icon={Save}
                iconBgColor="bg-orange-500"
                title="Sauver comme semaine type"
                onClick={() => setShowSaveTemplate(true)}
                showChevron
                showSeparator={false}
              />
            )}
          </IOSListGroup>

          {/* Save template input */}
          {showSaveTemplate && (
            <IOSListGroup className="mx-4">
              <div className="px-4 py-3 bg-card flex items-center gap-2">
                <Input
                  value={templateName}
                  onChange={e => setTemplateName(e.target.value)}
                  placeholder="Nom de la semaine type..."
                  className="h-9 text-[15px] flex-1"
                  autoFocus
                  onKeyDown={e => e.key === "Enter" && saveAsTemplate()}
                />
                <Button size="sm" className="h-9 text-[13px]" onClick={saveAsTemplate} disabled={!templateName.trim()}>
                  <Save className="h-3.5 w-3.5 mr-1" />
                  Sauver
                </Button>
                <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setShowSaveTemplate(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </IOSListGroup>
          )}
          {/* ── AJUSTEMENTS ATHLÈTES section ── */}
          {selectedSession && selectedIndex !== null && sessions.length > 0 && (
            <IOSListGroup header="AJUSTEMENTS PAR ATHLÈTE" className="mx-4">
              <Collapsible open={showAthleteOverrides} onOpenChange={setShowAthleteOverrides}>
                <CollapsibleTrigger asChild>
                  <div className="px-4 py-3 bg-card flex items-center justify-between cursor-pointer hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-purple-500 flex items-center justify-center">
                        <Users className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <p className="text-[15px] font-medium text-foreground">
                          Personnaliser les allures
                        </p>
                        <p className="text-[12px] text-muted-foreground">
                          {Object.keys(selectedSession.athleteOverrides).length > 0
                            ? `${Object.keys(selectedSession.athleteOverrides).length} athlète${Object.keys(selectedSession.athleteOverrides).length > 1 ? "s" : ""} personnalisé${Object.keys(selectedSession.athleteOverrides).length > 1 ? "s" : ""}`
                            : `Ajuster séries/allure pour ${DAY_LABELS[selectedSession.dayIndex]} — ${selectedSession.objective || "séance"}`
                          }
                        </p>
                      </div>
                    </div>
                    <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${showAthleteOverrides ? "rotate-180" : ""}`} />
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="px-4 py-3 bg-card border-t border-border">
                    <AthleteOverrideEditor
                      members={getMembersForGroup(activeGroupId)}
                      overrides={selectedSession.athleteOverrides}
                      onChange={ov => updateSession(selectedIndex, { ...selectedSession, athleteOverrides: ov })}
                      basePace={globalBasePace}
                      baseReps={globalBaseReps}
                      baseRecovery={globalBaseRecovery}
                    />
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </IOSListGroup>
          )}
        </div>

        {/* ── Fixed footer ── */}
        <div className="shrink-0 border-t border-border p-4 space-y-3 bg-card">
          {totalSessionsCount > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="secondary" className="text-[11px]">
                {totalSessionsCount} séance{totalSessionsCount > 1 ? "s" : ""} → {groupsWithPlans.map(id =>
                  id === "club" ? `Club (${members.length})` : `${groups.find(g => g.id === id)?.name} (${groups.find(g => g.id === id)?.memberIds.length || 0})`
                ).join(", ")}
              </Badge>
            </div>
          )}
          <Button
            className="w-full h-11 text-[17px]"
            onClick={handleSendPlan}
            disabled={totalSessionsCount === 0 || sending}
          >
            {sending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Send className="h-4 w-4 mr-2" />
            )}
            Envoyer {totalSessionsCount > 0 ? `${totalSessionsCount} séances` : "le plan"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
