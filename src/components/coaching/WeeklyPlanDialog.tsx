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
import { ArrowLeft, ChevronLeft, ChevronRight, Plus, Send, Loader2, Copy, Save, FolderOpen, Trash2, X, Users, ChevronDown, BarChart3, History, TrendingUp } from "lucide-react";
import { MesocycleView } from "./MesocycleView";
import { useSendNotification } from "@/hooks/useSendNotification";
import { format, startOfWeek, addWeeks, subWeeks, addDays } from "date-fns";
import { fr } from "date-fns/locale";
import { parseRCC, rccToSessionBlocks, computeRCCSummary } from "@/lib/rccParser";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger } from
"@/components/ui/dropdown-menu";

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
  initialWeek?: Date;
  initialGroupId?: string;
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
  athleteOverrides: {}
});

export const WeeklyPlanDialog = ({ isOpen, onClose, clubId, onSent, initialWeek, initialGroupId }: WeeklyPlanDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { sendPushNotification } = useSendNotification();
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
  const [targetAthletes, setTargetAthletes] = useState<string[]>([]);
  const [athleteSearch, setAthleteSearch] = useState("");
  const [draftSaveStatus, setDraftSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [sentAt, setSentAt] = useState<string | null>(null);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
  const sessions = groupPlans[activeGroupId] || [];

  const setSessions = useCallback((updater: (prev: WeekSession[]) => WeekSession[]) => {
    setGroupPlans((prev) => ({
      ...prev,
      [activeGroupId]: updater(prev[activeGroupId] || [])
    }));
  }, [activeGroupId]);

  // Apply initial props
  useEffect(() => {
    if (isOpen) {
      if (initialWeek) setCurrentWeek(initialWeek);
      if (initialGroupId) setActiveGroupId(initialGroupId);
      loadMembers();
      loadGroups();
      loadTemplates();
    }
  }, [isOpen, clubId]);

  // Load draft when week/group changes
  useEffect(() => {
    if (isOpen && user) {
      loadDraft();
    }
  }, [isOpen, weekStart.toISOString(), activeGroupId, user]);

  // Auto-save draft with debounce
  useEffect(() => {
    if (!isOpen || !user || sessions.length === 0) return;
    setDraftSaveStatus("idle");
    const timer = setTimeout(() => {
      saveDraft();
    }, 2000);
    return () => clearTimeout(timer);
  }, [JSON.stringify(sessions), JSON.stringify(targetAthletes)]);

  const loadDraft = async () => {
    if (!user) return;
    const weekStartStr = format(weekStart, "yyyy-MM-dd");
    const { data } = await supabase.
    from("coaching_drafts" as any).
    select("*").
    eq("coach_id", user.id).
    eq("club_id", clubId).
    eq("week_start", weekStartStr).
    eq("group_id", activeGroupId).
    maybeSingle();
    if (data) {
      const draft = data as any;
      const restored = (draft.sessions || []).map((s: any) => ({
        ...s,
        parsedBlocks: s.parsedBlocks || [],
        athleteOverrides: s.athleteOverrides || {}
      }));
      setGroupPlans((prev) => ({ ...prev, [activeGroupId]: restored }));
      setTargetAthletes(draft.target_athletes || []);
      setSentAt(draft.sent_at || null);
    } else {
      // No draft — try loading already-sent sessions from coaching_sessions
      await loadSentSessions();
    }
  };

  const loadSentSessions = async () => {
    if (!user) return;
    const weekEndDate = addDays(weekStart, 7);
    let query = supabase.
    from("coaching_sessions").
    select("*").
    eq("club_id", clubId).
    eq("coach_id", user.id).
    gte("scheduled_at", weekStart.toISOString()).
    lt("scheduled_at", weekEndDate.toISOString());

    if (activeGroupId !== "club") {
      query = query.eq("target_group_id", activeGroupId);
    } else {
      query = query.is("target_group_id", null);
    }

    const { data: sentSessions } = await query;
    if (sentSessions && sentSessions.length > 0) {
      const imported: WeekSession[] = sentSessions.map((cs) => {
        const scheduledDate = new Date(cs.scheduled_at);
        const dayOfWeek = scheduledDate.getDay();
        const dayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        return {
          dayIndex,
          activityType: cs.activity_type || "running",
          objective: cs.objective || cs.title || "",
          rccCode: cs.rcc_code || "",
          parsedBlocks: cs.rcc_code ? parseRCC(cs.rcc_code).blocks : [],
          coachNotes: cs.coach_notes || "",
          locationName: cs.default_location_name || "",
          athleteOverrides: {}
        };
      });
      setGroupPlans((prev) => ({ ...prev, [activeGroupId]: imported }));
      setSentAt(sentSessions[0].created_at);
    } else {
      if (!groupPlans[activeGroupId] || groupPlans[activeGroupId].length === 0) {
        setTargetAthletes([]);
        setSentAt(null);
      }
    }
  };

  const saveDraft = async () => {
    if (!user || sessions.length === 0) return;
    setDraftSaveStatus("saving");
    const weekStartStr = format(weekStart, "yyyy-MM-dd");
    const stripped = sessions.map(({ parsedBlocks, ...rest }) => rest);
    await supabase.from("coaching_drafts" as any).upsert({
      coach_id: user.id,
      club_id: clubId,
      week_start: weekStartStr,
      group_id: activeGroupId,
      sessions: stripped,
      target_athletes: targetAthletes
    } as any, { onConflict: "coach_id,club_id,week_start,group_id" } as any);
    setDraftSaveStatus("saved");
  };

  const loadMembers = async () => {
    const { data } = await supabase.
    from("group_members").
    select("user_id").
    eq("conversation_id", clubId);
    if (data && data.length > 0) {
      const userIds = data.map((d) => d.user_id);
      const { data: profiles } = await supabase.
      from("profiles").
      select("user_id, display_name").
      in("user_id", userIds);
      setMembers(
        (profiles || []).
        filter((p) => p.user_id !== user?.id).
        map((p) => ({ user_id: p.user_id!, display_name: p.display_name || "Athlète" }))
      );
    }
  };

  const loadGroups = async () => {
    const { data: groupsData } = await supabase.
    from("club_groups").
    select("id, name, color").
    eq("club_id", clubId);
    if (groupsData && groupsData.length > 0) {
      const { data: memberships } = await supabase.
      from("club_group_members").
      select("group_id, user_id").
      in("group_id", groupsData.map((g) => g.id));
      const memberMap: Record<string, string[]> = {};
      (memberships || []).forEach((m) => {
        if (!memberMap[m.group_id]) memberMap[m.group_id] = [];
        memberMap[m.group_id].push(m.user_id);
      });
      setGroups(groupsData.map((g) => ({ ...g, memberIds: memberMap[g.id] || [] })));
    } else {
      setGroups([]);
    }
  };

  const loadTemplates = async () => {
    if (!user) return;
    const { data } = await supabase.
    from("coaching_week_templates").
    select("id, name, sessions").
    eq("coach_id", user.id).
    order("created_at", { ascending: false });
    if (data) {
      setTemplates(data.map((t) => ({
        id: t.id,
        name: t.name,
        sessions: t.sessions as any || []
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
    setSessions((prev) => [...prev, newSession]);
    setSelectedIndex(sessions.length);
  };

  const updateSession = (index: number, updated: WeekSession) => {
    setSessions((prev) => prev.map((s, i) => i === index ? updated : s));
  };

  const deleteSession = (index: number) => {
    setSessions((prev) => prev.filter((_, i) => i !== index));
    setSelectedIndex(null);
  };

  const duplicateToDay = (sourceIndex: number, targetDay: number) => {
    const source = sessions[sourceIndex];
    const dup: WeekSession = { ...source, dayIndex: targetDay, athleteOverrides: { ...source.athleteOverrides } };
    setSessions((prev) => [...prev, dup]);
    toast({ title: `Séance dupliquée vers ${DAY_LABELS[targetDay]}` });
  };

  // ── Duplicate entire plan to another group ──
  const duplicatePlanToGroup = (targetGroupId: string) => {
    const currentSessions = groupPlans[activeGroupId] || [];
    if (currentSessions.length === 0) return;
    const cloned = currentSessions.map((s) => ({
      ...s,
      athleteOverrides: {}
    }));
    setGroupPlans((prev) => ({
      ...prev,
      [targetGroupId]: [...(prev[targetGroupId] || []), ...cloned]
    }));
    setActiveGroupId(targetGroupId);
    setSelectedIndex(null);
    const targetName = targetGroupId === "club" ?
    "Tout le club" :
    groups.find((g) => g.id === targetGroupId)?.name || "Groupe";
    toast({ title: `Plan dupliqué vers ${targetName}`, description: `${cloned.length} séances copiées` });
  };

  // ── Templates ──
  const saveAsTemplate = async () => {
    if (!user || !templateName.trim() || sessions.length === 0) return;
    const stripped = sessions.map(({ athleteOverrides, parsedBlocks, ...rest }) => rest);
    const { error } = await supabase.from("coaching_week_templates").insert({
      coach_id: user.id,
      name: templateName.trim(),
      sessions: stripped as any
    });
    if (!error) {
      toast({ title: "Semaine type sauvegardée !" });
      setShowSaveTemplate(false);
      setTemplateName("");
      loadTemplates();
    }
  };

  const loadTemplate = (template: WeekTemplate) => {
    const restored: WeekSession[] = template.sessions.map((s) => ({
      ...s,
      parsedBlocks: s.parsedBlocks || [],
      athleteOverrides: s.athleteOverrides || {}
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
    const group = groups.find((g) => g.id === groupId);
    return group ? members.filter((m) => group.memberIds.includes(m.user_id)) : members;
  };

  // ── Count total sessions across all groups ──
  const totalSessionsCount = useMemo(() => {
    return Object.values(groupPlans).reduce((sum, s) => sum + s.length, 0);
  }, [groupPlans]);

  // ── Weekly load summary ──
  const weekLoadSummary = useMemo(() => {
    if (sessions.length === 0) return null;
    let totalKm = 0;
    let totalDuration = 0;
    let qualitySessions = 0;

    for (const s of sessions) {
      if (s.rccCode) {
        const { blocks } = parseRCC(s.rccCode);
        const summary = computeRCCSummary(blocks);
        totalKm += summary.totalDistanceKm;
        totalDuration += summary.totalDurationMin;
        if (summary.intensity === 'Intense' || summary.intensity === 'Très intense') {
          qualitySessions++;
        }
      }
    }

    let intensity: string = 'Facile';
    if (totalKm > 60) intensity = 'Très intense';else
    if (totalKm > 45) intensity = 'Intense';else
    if (totalKm > 30) intensity = 'Modérée';

    return { totalKm: Math.round(totalKm * 10) / 10, totalDuration: Math.round(totalDuration), qualitySessions, intensity };
  }, [sessions]);

  // ── Daily charge for bar chart ──
  const dailyCharge = useMemo(() => {
    const charges = Array(7).fill(0);
    for (const s of sessions) {
      let charge = 1; // base charge per session
      if (s.rccCode) {
        const { blocks } = parseRCC(s.rccCode);
        const summary = computeRCCSummary(blocks);
        charge = summary.totalDistanceKm || 1;
      }
      charges[s.dayIndex] += charge;
    }
    return charges as number[];
  }, [sessions]);

  // ── Duplicate previous week ──
  const loadPreviousWeek = async () => {
    if (!user) return;
    const prevWeekStart = subWeeks(weekStart, 1);
    const prevWeekEnd = addDays(prevWeekStart, 7);

    const targetGroupId = activeGroupId !== "club" ? activeGroupId : null;

    let query = supabase.
    from("coaching_sessions").
    select("*").
    eq("club_id", clubId).
    eq("coach_id", user.id).
    gte("scheduled_at", prevWeekStart.toISOString()).
    lt("scheduled_at", prevWeekEnd.toISOString());

    if (targetGroupId) {
      query = query.eq("target_group_id", targetGroupId);
    }

    const { data } = await query;
    if (!data || data.length === 0) {
      toast({ title: "Aucune séance", description: "Pas de séances trouvées la semaine précédente pour ce groupe", variant: "destructive" });
      return;
    }

    const imported: WeekSession[] = data.map((cs) => {
      const scheduledDate = new Date(cs.scheduled_at);
      const dayOfWeek = scheduledDate.getDay();
      const dayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Convert to Mon=0
      return {
        dayIndex,
        activityType: cs.activity_type || "running",
        objective: cs.objective || cs.title || "",
        rccCode: cs.rcc_code || "",
        parsedBlocks: cs.rcc_code ? parseRCC(cs.rcc_code).blocks : [],
        coachNotes: cs.coach_notes || "",
        locationName: cs.default_location_name || "",
        athleteOverrides: {}
      };
    });

    setSessions(() => imported);
    setSelectedIndex(null);
    toast({ title: "Semaine précédente chargée", description: `${imported.length} séances importées` });
  };

  const groupsWithPlans = useMemo(() => {
    return Object.entries(groupPlans).
    filter(([, s]) => s.length > 0).
    map(([id]) => id);
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

          const { data: created, error } = await supabase.
          from("coaching_sessions").
          insert({
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
            target_group_id: targetGroupDbId
          }).
          select("id").
          single();

          if (error) throw error;

          if (created && targetMembers.length > 0) {
            const participations = targetMembers.map((m) => ({
              coaching_session_id: created.id,
              user_id: m.user_id,
              status: "sent",
              athlete_overrides: JSON.parse(JSON.stringify(session.athleteOverrides[m.user_id] || {}))
            }));
            await supabase.from("coaching_participations").insert(participations);
          }
        }
      }

      // Notify athletes in-app + push
      const { data: coachProfile } = await supabase.
      from("profiles").
      select("display_name, username").
      eq("user_id", user.id).
      single();
      const coachName = coachProfile?.display_name || coachProfile?.username || "Coach";
      const weekLabel = format(weekStart, "d MMM", { locale: fr });

      const notifiedSet = new Set<string>();
      for (const [groupId, groupSessions] of Object.entries(groupPlans)) {
        if (groupSessions.length === 0) continue;
        const targetMembers = getMembersForGroup(groupId);
        for (const m of targetMembers) {
          if (notifiedSet.has(m.user_id)) continue;
          notifiedSet.add(m.user_id);
          await supabase.from("notifications").insert({
            user_id: m.user_id,
            type: "coaching_plan",
            title: "📋 Nouveau plan d'entraînement",
            message: `${coachName} vous a envoyé un plan pour la semaine du ${weekLabel}`,
            data: { club_id: clubId, week_start: format(weekStart, "yyyy-MM-dd") }
          });
          sendPushNotification(m.user_id, "📋 Nouveau plan", `Plan semaine du ${weekLabel}`, "coaching_plan");
        }
      }

      const groupLabels = groupsWithPlans.map((id) =>
      id === "club" ? "Club" : groups.find((g) => g.id === id)?.name || "Groupe"
      );
      toast({
        title: "Plan envoyé ! 🚀",
        description: `${totalSessionsCount} séances → ${groupLabels.join(", ")}`
      });
      // Keep data, mark as sent
      setSentAt(new Date().toISOString());
      // Update draft with sent_at
      const weekStartStr = format(weekStart, "yyyy-MM-dd");
      for (const groupId of groupsWithPlans) {
        const stripped = (groupPlans[groupId] || []).map(({ parsedBlocks, ...rest }) => rest);
        await supabase.from("coaching_drafts" as any).upsert({
          coach_id: user.id,
          club_id: clubId,
          week_start: weekStartStr,
          group_id: groupId,
          sessions: stripped,
          target_athletes: targetAthletes,
          sent_at: new Date().toISOString()
        } as any, { onConflict: "coach_id,club_id,week_start,group_id" } as any);
      }
      setSelectedIndex(null);
      onSent?.();
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
    return all.filter((g) => g.id !== activeGroupId);
  }, [groups, activeGroupId]);

  const activeGroupLabel = activeGroupId === "club" ?
  "Tout le club" :
  groups.find((g) => g.id === activeGroupId)?.name || "Groupe";

  const activeGroupMemberCount = getMembersForGroup(activeGroupId).length;

  // ── Duplicate plan dropdown state ──
  const [showDupDropdown, setShowDupDropdown] = useState(false);
  const [showTemplateList, setShowTemplateList] = useState(false);
  const [showAthleteOverrides, setShowAthleteOverrides] = useState(false);
  const [showMesocycle, setShowMesocycle] = useState(false);

  // Get base values from the selected session for override defaults
  const selectedSessionIntervalBlock = selectedSession?.parsedBlocks?.find((b) => b.type === "interval");
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
            className="flex items-center gap-0.5 text-primary text-[17px] min-w-[70px]">

            <ArrowLeft className="h-5 w-5" />
            <span className="text-[15px]">Retour</span>
          </button>
          <span className="flex-1 text-center text-[17px] font-semibold text-foreground">
            Plan de semaine
          </span>
          <div className="min-w-[70px]" />
        </div>

        {/* ── Scrollable body ── */}
        <div
          className="flex-1 overflow-y-auto bg-secondary pb-4"
          onTouchStart={(e) => setTouchStartX(e.touches[0].clientX)}
          onTouchEnd={(e) => {
            if (touchStartX === null) return;
            const dx = e.changedTouches[0].clientX - touchStartX;
            if (Math.abs(dx) > 60) {
              if (dx > 0) setCurrentWeek((prev) => subWeeks(prev, 1));else
              setCurrentWeek((prev) => addWeeks(prev, 1));
            }
            setTouchStartX(null);
          }}>

          {/* ── ATHLETE / GROUP SEARCH ── */}
          <div className="mx-4 mt-4 mb-2">
            <Input
              placeholder="🔍 Rechercher un athlète ou groupe..."
              value={athleteSearch}
              onChange={(e) => setAthleteSearch(e.target.value)}
              className="h-10 text-[15px]" />


            {/* Selected group chip */}
            {activeGroupId !== "club" &&
            <div className="flex flex-wrap gap-1.5 mt-2">
                {(() => {
                const g = groups.find((g) => g.id === activeGroupId);
                if (!g) return null;
                return (
                  <button
                    onClick={() => {setActiveGroupId("club");setSelectedIndex(null);}}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-accent text-accent-foreground text-[12px] font-medium">

                      <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: g.color }} />
                      {g.name}
                      <X className="h-3 w-3" />
                    </button>);

              })()}
              </div>
            }

            {/* Selected athlete chips */}
            {targetAthletes.length > 0 &&
            <div className="flex flex-wrap gap-1.5 mt-2">
                {targetAthletes.map((id) => {
                const m = members.find((m) => m.user_id === id);
                return;









              })}
              </div>
            }

            {/* Unified search results: groups + athletes */}
            {athleteSearch.trim().length > 0 &&
            <div className="bg-card rounded-[10px] border border-border mt-1 max-h-40 overflow-y-auto">
                {/* Group results */}
                {groups.
              filter((g) => g.name.toLowerCase().includes(athleteSearch.toLowerCase())).
              map((g) =>
              <button
                key={`group-${g.id}`}
                onClick={() => {
                  setActiveGroupId(g.id);
                  setSelectedIndex(null);
                  setAthleteSearch("");
                }}
                className="w-full text-left px-3 py-2 text-[14px] text-foreground hover:bg-muted transition-colors border-b border-border last:border-0 flex items-center gap-2">

                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: g.color }} />
                      <span className="font-medium">{g.name}</span>
                      <span className="text-[12px] text-muted-foreground ml-auto">Groupe · {g.memberIds.length}</span>
                    </button>
              )
              }
                {/* Athlete results */}
                {members.
              filter((m) =>
              m.display_name.toLowerCase().includes(athleteSearch.toLowerCase()) &&
              !targetAthletes.includes(m.user_id)
              ).
              slice(0, 5).
              map((m) =>
              <button
                key={m.user_id}
                onClick={() => {
                  setTargetAthletes((prev) => [...prev, m.user_id]);
                  setAthleteSearch("");
                }}
                className="w-full text-left px-3 py-2 text-[14px] text-foreground hover:bg-muted transition-colors border-b border-border last:border-0">

                      {m.display_name}
                    </button>
              )
              }
                {groups.filter((g) => g.name.toLowerCase().includes(athleteSearch.toLowerCase())).length === 0 &&
              members.filter((m) => m.display_name.toLowerCase().includes(athleteSearch.toLowerCase()) && !targetAthletes.includes(m.user_id)).length === 0 &&
              <p className="px-3 py-2 text-[13px] text-muted-foreground">Aucun résultat</p>
              }
              </div>
            }
          </div>

          {/* Sent badge */}
          {sentAt &&
          <div className="mx-4 mb-2 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-full bg-green-100 dark:bg-green-900/30">
              <span className="text-[12px] font-medium text-green-700 dark:text-green-400">
                ✓ Envoyé le {format(new Date(sentAt), "d MMM à HH:mm", { locale: fr })}
              </span>
            </div>
          }

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
            {groupsWithPlans.length > 1 &&
            <div className="px-4 pb-3 bg-card flex items-center gap-1.5 flex-wrap border-t border-border">
                {groupsWithPlans.map((id) => {
                const g = id === "club" ? null : groups.find((g) => g.id === id);
                const count = (groupPlans[id] || []).length;
                const isActive = id === activeGroupId;
                return (
                  <button
                    key={id}
                    onClick={() => {setActiveGroupId(id);setSelectedIndex(null);}}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors mt-2 ${
                    isActive ?
                    "bg-primary text-primary-foreground" :
                    "bg-muted text-muted-foreground hover:bg-accent"}`
                    }>

                      {g && <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: g.color }} />}
                      {g ? g.name : "Club"} ({count})
                    </button>);

              })}
              </div>
            }
          </IOSListGroup>

          {/* ── CHARGE DE LA SEMAINE with bar chart ── */}
          {weekLoadSummary &&
          <div className="mx-4 px-4 py-3 rounded-xl bg-card border border-border">
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                <span className="text-[13px] font-semibold text-foreground">Charge de la semaine</span>
              </div>
              <div className="flex items-center gap-3 text-[12px] text-muted-foreground flex-wrap mb-3">
                <span className="font-medium text-foreground">{weekLoadSummary.totalKm} km</span>
                <span>·</span>
                <span>{sessions.length} séance{sessions.length > 1 ? "s" : ""}</span>
                {weekLoadSummary.qualitySessions > 0 &&
              <>
                    <span>·</span>
                    <span>{weekLoadSummary.qualitySessions} qualité</span>
                  </>
              }
                <span>·</span>
                <Badge variant={
              weekLoadSummary.intensity === 'Très intense' ? 'destructive' :
              weekLoadSummary.intensity === 'Intense' ? 'default' :
              'secondary'
              } className="text-[10px] px-1.5 py-0">
                  {weekLoadSummary.intensity}
                </Badge>
              </div>
              {/* Mini bar chart */}
              {(() => {
              const maxCharge = Math.max(...dailyCharge, 1);
              return (
                <div className="flex items-end gap-1.5 h-16">
                    {DAY_LABELS.map((label, i) => {
                    const val = dailyCharge[i];
                    const pct = val / maxCharge * 100;
                    const daySessions = (sessionsByDay[i] || []).map((idx) => sessions[idx]);
                    const hasIntense = daySessions.some((s) => {
                      const obj = (s.objective || s.activityType || "").toLowerCase();
                      return obj.includes("vma") || obj.includes("seuil") || obj.includes("interval") || obj.includes("fractionné");
                    });
                    const barColor = val === 0 ? "bg-muted" : hasIntense ? "bg-red-400" : "bg-green-400";
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                          <div className="w-full flex items-end justify-center" style={{ height: 48 }}>
                            <div
                            className={`w-full max-w-[20px] rounded-t-sm transition-all ${barColor}`}
                            style={{ height: val > 0 ? `${Math.max(pct, 8)}%` : 4 }} />

                          </div>
                          <span className="text-[9px] text-muted-foreground">{label}</span>
                        </div>);

                  })}
                  </div>);

            })()}
            </div>
          }

          {/* ── SÉANCES grid section — colored pills ── */}
          <IOSListGroup header="SÉANCES" className="mx-4">
            <div className="px-3 py-3 bg-card">
              <div className="grid grid-cols-7 gap-1.5">
                {DAY_LABELS.map((label, dayIndex) => {
                  const daySessions = sessionsByDay[dayIndex] || [];
                  return (
                    <div key={dayIndex} className="flex flex-col items-center gap-1">
                      <span className="text-[10px] font-medium text-muted-foreground uppercase">{label}</span>
                      {daySessions.map((sIdx) => {
                        const s = sessions[sIdx];
                        const obj = (s.objective || s.activityType || "").toLowerCase();
                        let pillColor = "bg-green-500"; // EF default
                        let pillLabel = "EF";
                        if (obj.includes("vma") || obj.includes("interval") || obj.includes("fractionné")) {
                          pillColor = "bg-red-500";pillLabel = "VMA";
                        } else if (obj.includes("seuil")) {
                          pillColor = "bg-orange-500";pillLabel = "SEU";
                        } else if (obj.includes("récup") || obj.includes("recup")) {
                          pillColor = "bg-blue-500";pillLabel = "REC";
                        } else if (obj.includes("spé") || obj.includes("specifique")) {
                          pillColor = "bg-purple-500";pillLabel = "SPÉ";
                        } else if (s.objective) {
                          pillLabel = s.objective.slice(0, 3).toUpperCase();
                        }
                        const isSelected = selectedIndex === sIdx;
                        return (
                          <button
                            key={sIdx}
                            onClick={() => setSelectedIndex(sIdx)}
                            className={`w-full py-1 rounded-lg text-[9px] font-bold text-white transition-all ${pillColor} ${
                            isSelected ? "ring-2 ring-primary ring-offset-1 scale-105" : "opacity-85 hover:opacity-100"}`
                            }>

                            {pillLabel}
                          </button>);

                      })}
                      <button
                        onClick={() => addSession(dayIndex)}
                        className="w-full py-1 rounded-lg border border-dashed border-border text-[10px] text-muted-foreground hover:bg-muted transition-colors">

                        <Plus className="h-3 w-3 mx-auto" />
                      </button>
                    </div>);

                })}
              </div>
            </div>
          </IOSListGroup>

          {/* ── Éditeur de séance ── */}
          {selectedSession && selectedIndex !== null ?
          <IOSListGroup className="mx-4">
              <WeeklyPlanSessionEditor
              session={selectedSession}
              onChange={(s) => updateSession(selectedIndex, s)}
              onDuplicate={(targetDay) => duplicateToDay(selectedIndex, targetDay)}
              onDelete={() => deleteSession(selectedIndex)}
              members={getMembersForGroup(activeGroupId)} />

            </IOSListGroup> :

          <div className="text-center py-8 text-muted-foreground mx-4">
              <p className="text-[15px]">Cliquez sur <strong>+</strong> pour ajouter une séance</p>
              <p className="text-[13px] mt-1">ou sélectionnez une séance existante</p>
            </div>
          }

          {/* ── ACTIONS section ── */}
          <IOSListGroup header="ACTIONS" className="mx-4">
            <IOSListItem
              icon={History}
              iconBgColor="bg-amber-500"
              title="Dupliquer semaine précédente"
              subtitle="Charger les séances de S-1"
              onClick={loadPreviousWeek}
              showSeparator />

            {templates.length > 0 &&
            <IOSListItem
              icon={FolderOpen}
              iconBgColor="bg-blue-500"
              title="Charger semaine type"
              subtitle={`${templates.length} template${templates.length > 1 ? "s" : ""} disponible${templates.length > 1 ? "s" : ""}`}
              onClick={() => setShowTemplateList(!showTemplateList)}
              showSeparator />

            }
            {showTemplateList && templates.map((t) =>
            <div key={t.id} className="flex items-center justify-between px-4 py-2.5 bg-card border-b border-border last:border-0">
                <button
                onClick={() => {loadTemplate(t);setShowTemplateList(false);}}
                className="text-[15px] text-primary flex-1 text-left">

                  {t.name} ({t.sessions.length}s)
                </button>
                <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive"
                onClick={() => deleteTemplate(t.id)}>

                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
            {sessions.length > 0 && otherGroups.length > 0 &&
            <>
                <IOSListItem
                icon={Copy}
                iconBgColor="bg-green-500"
                title="Dupliquer vers un groupe"
                subtitle={`${sessions.length} séance${sessions.length > 1 ? "s" : ""} à copier`}
                onClick={() => setShowDupDropdown(!showDupDropdown)}
                showSeparator />

                {showDupDropdown && otherGroups.map((g) =>
              <div key={g.id} className="px-4 py-2.5 bg-card border-b border-border last:border-0">
                    <button
                  onClick={() => {duplicatePlanToGroup(g.id);setShowDupDropdown(false);}}
                  className="text-[15px] text-primary flex items-center gap-2 w-full text-left">

                      {g.id !== "club" &&
                  <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: g.color }} />
                  }
                      {g.name}
                    </button>
                  </div>
              )}
              </>
            }
            {sessions.length > 0 &&
            <IOSListItem
              icon={Save}
              iconBgColor="bg-orange-500"
              title="Sauver comme semaine type"
              onClick={() => setShowSaveTemplate(true)}
              showChevron
              showSeparator />

            }
            <IOSListItem
              icon={TrendingUp}
              iconBgColor="bg-indigo-500"
              title="Vue mesocycle (8 sem.)"
              subtitle="Progression volume et intensité"
              onClick={() => setShowMesocycle(!showMesocycle)}
              showSeparator={false} />

          </IOSListGroup>

          {/* Mesocycle panel */}
          {showMesocycle &&
          <div className="mx-4 p-4 rounded-xl bg-card border border-border">
              <MesocycleView clubId={clubId} currentWeek={currentWeek} />
            </div>
          }

          {/* Save template input */}
          {showSaveTemplate &&
          <IOSListGroup className="mx-4">
              <div className="px-4 py-3 bg-card flex items-center gap-2">
                <Input
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="Nom de la semaine type..."
                className="h-9 text-[15px] flex-1"
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && saveAsTemplate()} />

                <Button size="sm" className="h-9 text-[13px]" onClick={saveAsTemplate} disabled={!templateName.trim()}>
                  <Save className="h-3.5 w-3.5 mr-1" />
                  Sauver
                </Button>
                <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setShowSaveTemplate(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </IOSListGroup>
          }
          {/* ── AJUSTEMENTS ATHLÈTES section ── */}
          {selectedSession && selectedIndex !== null && sessions.length > 0 &&
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
                          {Object.keys(selectedSession.athleteOverrides).length > 0 ?
                        `${Object.keys(selectedSession.athleteOverrides).length} athlète${Object.keys(selectedSession.athleteOverrides).length > 1 ? "s" : ""} personnalisé${Object.keys(selectedSession.athleteOverrides).length > 1 ? "s" : ""}` :
                        `Ajuster séries/allure pour ${DAY_LABELS[selectedSession.dayIndex]} — ${selectedSession.objective || "séance"}`
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
                    onChange={(ov) => updateSession(selectedIndex, { ...selectedSession, athleteOverrides: ov })}
                    basePace={globalBasePace}
                    baseReps={globalBaseReps}
                    baseRecovery={globalBaseRecovery} />

                  </div>
                </CollapsibleContent>
              </Collapsible>
            </IOSListGroup>
          }

          {/* FAB - Add session for today */}
          <button
            onClick={() => {
              const todayDow = new Date().getDay();
              const dayIndex = todayDow === 0 ? 6 : todayDow - 1;
              addSession(dayIndex);
            }}
            className="fixed bottom-24 right-6 z-20 h-14 w-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg active:scale-95 transition-transform"
            style={{ boxShadow: '0 4px 14px hsl(var(--primary) / 0.4)' }}>

            <Plus className="h-6 w-6" />
          </button>
        </div>

        {/* ── Fixed footer ── */}
        <div className="shrink-0 border-t border-border p-4 space-y-3 bg-card">
          {/* Draft save status */}
          {draftSaveStatus !== "idle" &&
          <p className="text-[11px] text-muted-foreground text-center">
              {draftSaveStatus === "saving" ? "Sauvegarde..." : "✓ Brouillon sauvegardé"}
            </p>
          }
          {totalSessionsCount > 0 &&
          <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="secondary" className="text-[11px]">
                {totalSessionsCount} séance{totalSessionsCount > 1 ? "s" : ""} → {groupsWithPlans.map((id) =>
              id === "club" ? `Club (${members.length})` : `${groups.find((g) => g.id === id)?.name} (${groups.find((g) => g.id === id)?.memberIds.length || 0})`
              ).join(", ")}
              </Badge>
            </div>
          }
          <Button
            className="w-full h-11 text-[17px]"
            onClick={handleSendPlan}
            disabled={totalSessionsCount === 0 || sending}>

            {sending ?
            <Loader2 className="h-4 w-4 mr-2 animate-spin" /> :

            <Send className="h-4 w-4 mr-2" />
            }
            {sentAt ? "Renvoyer" : "Envoyer"} {totalSessionsCount > 0 ? `${totalSessionsCount} séances` : "le plan"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>);

};