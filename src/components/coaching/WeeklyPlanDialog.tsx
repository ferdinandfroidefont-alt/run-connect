import { useState, useEffect, useMemo, useCallback, useRef } from "react";
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
import { MonthlyCalendarView, type MonthSessionDot } from "./MonthlyCalendarView";
import { AthleteOverrideEditor } from "./AthleteOverrideEditor";
import { IOSListGroup, IOSListItem } from "@/components/ui/ios-list-item";
import { CoachingFullscreenHeader } from "./CoachingFullscreenHeader";
import { ChevronLeft, ChevronRight, Plus, Send, Loader2, Copy, Save, FolderOpen, Trash2, X, Users, ChevronDown, BarChart3, History, TrendingUp, FileText } from "lucide-react";
import { MesocycleView } from "./MesocycleView";
import { useSendNotification } from "@/hooks/useSendNotification";
import { format, startOfWeek, addWeeks, subWeeks, addDays, startOfMonth, endOfMonth, addMonths } from "date-fns";
import { fr } from "date-fns/locale";
import {
  parseRCC,
  rccToSessionBlocks,
  computeRCCSummary,
  mergeParsedBlocksByIndex,
  mergeStoredSessionBlocksIntoParsed,
  type ParsedBlock,
} from "@/lib/rccParser";
import {
  blockRpeFromCoachingRow,
  blockRpeToJson,
  migrateLegacyPhasesToBlockRpe,
  normalizeBlockRpeLength,
  normalizeSessionRpePhases,
  resolveSessionRpeForInsert,
  stripPerBlockRpeFromSessionBlocks,
  type SessionRpePhases,
} from "@/lib/sessionBlockRpe";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { IosFixedPageHeaderShell } from "@/components/layout/IosFixedPageHeaderShell";

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
  initialAthleteName?: string;
  initialAthleteId?: string;
  /** Séances à ajouter après chargement (ex. reprogrammation depuis le suivi). */
  initialSeedSessions?: WeekSession[];
}

type GroupPlans = Record<string, WeekSession[]>;

function restoreWeekSessionFromDraftOrTemplate(s: Record<string, unknown>): WeekSession {
  const parsedBlocks = (s.parsedBlocks as ParsedBlock[] | undefined) || [];
  let blockRpe: number[];
  if (Array.isArray(s.blockRpe)) {
    blockRpe = normalizeBlockRpeLength(s.blockRpe as number[], parsedBlocks.length);
  } else if (s.rpePhases && typeof s.rpePhases === "object") {
    blockRpe = migrateLegacyPhasesToBlockRpe(
      normalizeSessionRpePhases(s.rpePhases as Partial<SessionRpePhases>),
      parsedBlocks.length,
    );
  } else {
    blockRpe = normalizeBlockRpeLength([], parsedBlocks.length);
  }
  return {
    ...(s as unknown as WeekSession),
    parsedBlocks,
    athleteOverrides: (s.athleteOverrides as WeekSession["athleteOverrides"]) || {},
    blockRpe,
  };
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
  blockRpe: [],
});

export const WeeklyPlanDialog = ({
  isOpen,
  onClose,
  clubId,
  onSent,
  initialWeek,
  initialGroupId,
  initialAthleteName,
  initialAthleteId,
  initialSeedSessions,
}: WeeklyPlanDialogProps) => {
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
  const [hasDraft, setHasDraft] = useState(false);

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
  const sessions = groupPlans[activeGroupId] || [];
  const loadVersionRef = useRef(0);
  const isBootstrappedRef = useRef(false);
  const pendingSeedRef = useRef<WeekSession[] | null>(null);

  const [plannerView, setPlannerView] = useState<"week" | "month">("week");
  const [monthCursor, setMonthCursor] = useState(() => startOfMonth(new Date()));
  const [monthDbSessions, setMonthDbSessions] = useState<MonthSessionDot[]>([]);

  useEffect(() => {
    if (!isOpen) {
      pendingSeedRef.current = null;
      return;
    }
    if (initialSeedSessions?.length) {
      pendingSeedRef.current = initialSeedSessions;
    }
  }, [isOpen, initialSeedSessions]);

  useEffect(() => {
    if (plannerView === "month") {
      setMonthCursor(startOfMonth(currentWeek));
    }
  }, [plannerView, weekStart.toISOString()]);

  const setSessions = useCallback((updater: (prev: WeekSession[]) => WeekSession[]) => {
    setGroupPlans(prev => ({
      ...prev,
      [activeGroupId]: updater(prev[activeGroupId] || []),
    }));
  }, [activeGroupId]);

  // ── Deterministic bootstrap on open ──
  useEffect(() => {
    if (!isOpen || !user) {
      isBootstrappedRef.current = false;
      return;
    }

    // Force reset all state
    const resolvedWeek = initialWeek ?? new Date();
    const resolvedGroupId = initialGroupId ?? "club";
    setCurrentWeek(resolvedWeek);
    setActiveGroupId(resolvedGroupId);
    setGroupPlans({});
    setTargetAthletes([]);
    setSentAt(null);
    setHasDraft(false);
    setSelectedIndex(null);
    setAthleteSearch("");
    setDraftSaveStatus("idle");
    setPlannerView("week");

    // Load base data, then resolve athlete & load sessions
    const bootstrap = async () => {
      await Promise.all([loadMembers(), loadGroups(), loadTemplates()]);
      isBootstrappedRef.current = true;
    };
    bootstrap();
  }, [isOpen, clubId]);

  // ── Once members loaded + bootstrapped, resolve athlete & load sessions ──
  useEffect(() => {
    if (!isOpen || !isBootstrappedRef.current || members.length === 0) return;

    const resolvedWeek = initialWeek ?? new Date();
    const resolvedGroupId = initialGroupId ?? "club";
    const resolvedWeekStart = startOfWeek(resolvedWeek, { weekStartsOn: 1 });

    // Resolve athlete
    const resolvedAthleteId = initialAthleteId || members.find(m =>
      initialAthleteName && m.display_name.toLowerCase() === initialAthleteName.toLowerCase()
    )?.user_id || null;

    if (resolvedAthleteId) {
      setTargetAthletes([resolvedAthleteId]);
    }

    // Load sessions with explicit params
    loadSentSessionsWithParams(resolvedWeekStart, resolvedGroupId, resolvedAthleteId);
  }, [isOpen, members, initialAthleteId, initialAthleteName]);

  // ── Reload on week/group change AFTER bootstrap ──
  useEffect(() => {
    if (!isOpen || !user || !isBootstrappedRef.current || members.length === 0) return;

    // Skip the initial bootstrap load (handled above)
    const focusedAthleteId = initialAthleteId || (targetAthletes.length === 1 ? targetAthletes[0] : null);
    loadSentSessionsWithParams(weekStart, activeGroupId, focusedAthleteId);
  }, [weekStart.toISOString(), activeGroupId]);

  // Auto-save draft with debounce
  useEffect(() => {
    if (!isOpen || !user || sessions.length === 0) return;
    setDraftSaveStatus("idle");
    const timer = setTimeout(() => {
      saveDraft();
    }, 2000);
    return () => clearTimeout(timer);
  }, [JSON.stringify(sessions), JSON.stringify(targetAthletes)]);

  // ── Load sent sessions with explicit params (no stale closures) ──
  const loadSentSessionsWithParams = async (
    weekStartParam: Date,
    groupIdParam: string,
    focusedAthleteIdParam: string | null
  ) => {
    if (!user) return;
    const version = ++loadVersionRef.current;
    const weekEndDate = addDays(weekStartParam, 7);

    try {
      if (focusedAthleteIdParam) {
        const { data: weekSessions } = await supabase
          .from("coaching_sessions")
          .select("*")
          .eq("club_id", clubId)
          .gte("scheduled_at", weekStartParam.toISOString())
          .lt("scheduled_at", weekEndDate.toISOString());

        if (version !== loadVersionRef.current) return;

        if (!weekSessions || weekSessions.length === 0) {
          setGroupPlans(prev => ({ ...prev, [groupIdParam]: [] }));
          setSentAt(null);
          return;
        }

        const sessionIds = weekSessions.map(s => s.id);

        const { data: participations } = await supabase
          .from("coaching_participations")
          .select("coaching_session_id, athlete_overrides")
          .eq("user_id", focusedAthleteIdParam)
          .in("coaching_session_id", sessionIds);

        if (version !== loadVersionRef.current) return;

        const participationSessionIds = new Set((participations || []).map(p => p.coaching_session_id));
        const athleteSessions = weekSessions.filter(s => participationSessionIds.has(s.id));

        if (athleteSessions.length > 0) {
          const imported: WeekSession[] = athleteSessions.map(cs => {
            const scheduledDate = new Date(cs.scheduled_at);
            const dayOfWeek = scheduledDate.getDay();
            const dayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
            const parsedBlocks = cs.rcc_code
              ? mergeStoredSessionBlocksIntoParsed(parseRCC(cs.rcc_code).blocks, cs.session_blocks)
              : [];
            return {
              dayIndex,
              activityType: cs.activity_type || "running",
              objective: cs.objective || cs.title || "",
              rccCode: cs.rcc_code || "",
              parsedBlocks,
              coachNotes: cs.coach_notes || "",
              locationName: cs.default_location_name || "",
              athleteOverrides: {},
              blockRpe: blockRpeFromCoachingRow(cs as { rpe?: number | null; rpe_phases?: unknown }, parsedBlocks.length),
            };
          });
          setGroupPlans(prev => ({ ...prev, [groupIdParam]: imported }));
          setTargetAthletes([focusedAthleteIdParam]);
          setSentAt(athleteSessions[0].created_at);
        } else {
          setGroupPlans(prev => ({ ...prev, [groupIdParam]: [] }));
          setSentAt(null);
        }
        return;
      }

      let query = supabase
        .from("coaching_sessions")
        .select("*")
        .eq("club_id", clubId)
        .gte("scheduled_at", weekStartParam.toISOString())
        .lt("scheduled_at", weekEndDate.toISOString());

      if (groupIdParam !== "club") {
        query = query.eq("target_group_id", groupIdParam);
      } else {
        query = query.is("target_group_id", null);
      }

      const { data: sentSessions } = await query.order("scheduled_at", { ascending: true });

      if (version !== loadVersionRef.current) return;

      if (sentSessions && sentSessions.length > 0) {
        const imported: WeekSession[] = sentSessions.map(cs => {
          const scheduledDate = new Date(cs.scheduled_at);
          const dayOfWeek = scheduledDate.getDay();
          const dayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
          const parsedBlocks = cs.rcc_code
            ? mergeStoredSessionBlocksIntoParsed(parseRCC(cs.rcc_code).blocks, cs.session_blocks)
            : [];
          return {
            dayIndex,
            activityType: cs.activity_type || "running",
            objective: cs.objective || cs.title || "",
            rccCode: cs.rcc_code || "",
            parsedBlocks,
            coachNotes: cs.coach_notes || "",
            locationName: cs.default_location_name || "",
            athleteOverrides: {},
            blockRpe: blockRpeFromCoachingRow(cs as { rpe?: number | null; rpe_phases?: unknown }, parsedBlocks.length),
          };
        });
        setGroupPlans(prev => ({ ...prev, [groupIdParam]: imported }));
        setSentAt(sentSessions[0].created_at);
      } else {
        setGroupPlans(prev => ({ ...prev, [groupIdParam]: [] }));
        setTargetAthletes([]);
        setSentAt(null);
      }

      const weekStartStr = format(weekStartParam, "yyyy-MM-dd");
      const { data } = await supabase
        .from("coaching_drafts" as any)
        .select("id, sent_at")
        .eq("coach_id", user.id)
        .eq("club_id", clubId)
        .eq("week_start", weekStartStr)
        .eq("group_id", groupIdParam)
        .is("sent_at", null)
        .maybeSingle();
      if (version === loadVersionRef.current) {
        setHasDraft(!!data);
      }
    } finally {
      if (version !== loadVersionRef.current) return;
      const seed = pendingSeedRef.current;
      if (seed?.length) {
        pendingSeedRef.current = null;
        setGroupPlans(prev => ({
          ...prev,
          [groupIdParam]: [...(prev[groupIdParam] || []), ...seed],
        }));
      }
    }
  };

  useEffect(() => {
    if (!isOpen || !user || plannerView !== "month") return;
    const ms = startOfMonth(monthCursor);
    const monthAfter = addMonths(ms, 1);
    let q = supabase
      .from("coaching_sessions")
      .select("id, scheduled_at, objective, title, activity_type, target_group_id")
      .eq("club_id", clubId)
      .eq("coach_id", user.id)
      .gte("scheduled_at", ms.toISOString())
      .lt("scheduled_at", monthAfter.toISOString());
    if (activeGroupId !== "club") {
      q = q.eq("target_group_id", activeGroupId);
    } else {
      q = q.is("target_group_id", null);
    }
    void q.order("scheduled_at", { ascending: true }).then(({ data, error }) => {
      if (!error && data) setMonthDbSessions(data as MonthSessionDot[]);
      else setMonthDbSessions([]);
    });
  }, [isOpen, user, plannerView, monthCursor, activeGroupId, clubId]);

  const loadDraft = async () => {
    if (!user) return;
    const weekStartStr = format(weekStart, "yyyy-MM-dd");

    const { data } = await supabase
      .from("coaching_drafts" as any)
      .select("*")
      .eq("club_id", clubId)
      .eq("coach_id", user.id)
      .eq("week_start", weekStartStr)
      .eq("group_id", activeGroupId)
      .maybeSingle();
    if (data) {
      const draft = data as any;
      const restored = (draft.sessions || []).map((s: any) => restoreWeekSessionFromDraftOrTemplate(s));
      setGroupPlans(prev => ({ ...prev, [activeGroupId]: restored }));
      setTargetAthletes(draft.target_athletes || []);
      setSentAt(draft.sent_at || null);
      setHasDraft(false);
      toast({ title: "Brouillon chargé", description: `${restored.length} séances restaurées` });
    }
  };

  const saveDraft = async () => {
    if (!user || sessions.length === 0) return;
    setDraftSaveStatus("saving");
    try {
      const weekStartStr = format(weekStart, "yyyy-MM-dd");
      const stripped = sessions.map(({ parsedBlocks, ...rest }) => rest);
      const { error } = await supabase.from("coaching_drafts" as any).upsert(
        {
          coach_id: user.id,
          club_id: clubId,
          week_start: weekStartStr,
          group_id: activeGroupId,
          sessions: stripped,
          target_athletes: targetAthletes,
        } as any,
        { onConflict: "coach_id,club_id,week_start,group_id" } as any
      );
      if (error) throw error;
      setDraftSaveStatus("saved");
    } catch (e) {
      console.error("saveDraft coaching:", e);
      setDraftSaveStatus("idle");
      toast({
        title: "Brouillon non enregistré",
        description: "Vérifiez la connexion ou réessayez.",
        variant: "destructive",
      });
    }
  };

  const loadMembers = async () => {
    const { data, error } = await supabase
      .from("group_members")
      .select("user_id")
      .eq("conversation_id", clubId);
    if (error || !data?.length) {
      setMembers([]);
      return;
    }
    const userIds = data.map(d => d.user_id);
    const { data: profiles, error: profError } = await supabase
      .from("profiles")
      .select("user_id, display_name")
      .in("user_id", userIds);
    if (profError) {
      setMembers([]);
      return;
    }
    setMembers(
      (profiles || []).map(p => ({ user_id: p.user_id!, display_name: p.display_name || "Athlète" }))
    );
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
    const restored: WeekSession[] = template.sessions.map((s: any) => restoreWeekSessionFromDraftOrTemplate(s));
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
    // If specific athletes are targeted, always use that filter
    if (targetAthletes.length > 0) {
      return members.filter(m => targetAthletes.includes(m.user_id));
    }
    if (groupId === "club") return members;
    const group = groups.find(g => g.id === groupId);
    return group ? members.filter(m => group.memberIds.includes(m.user_id)) : members;
  };

  // Check if we have a valid target (group selected, athletes selected, or explicitly club)
  const hasValidTarget = activeGroupId !== "club" || targetAthletes.length > 0 || members.length > 0;

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
    if (totalKm > 60) intensity = 'Très intense';
    else if (totalKm > 45) intensity = 'Intense';
    else if (totalKm > 30) intensity = 'Modérée';

    return { totalKm: Math.round(totalKm * 10) / 10, totalDuration: Math.round(totalDuration), qualitySessions, intensity };
  }, [sessions]);

  // ── Daily charge for bar chart ──
  const dailyCharge = useMemo(() => {
    const charges = Array(7).fill(0);
    for (const s of sessions) {
      let charge = 1;
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
    
    let query = supabase
      .from("coaching_sessions")
      .select("*")
      .eq("club_id", clubId)
      .eq("coach_id", user.id)
      .gte("scheduled_at", prevWeekStart.toISOString())
      .lt("scheduled_at", prevWeekEnd.toISOString());

    if (activeGroupId !== "club") {
      query = query.eq("target_group_id", activeGroupId);
    } else {
      query = query.is("target_group_id", null);
    }

    const { data } = await query;
    if (!data || data.length === 0) {
      toast({ title: "Aucune séance", description: "Pas de séances trouvées la semaine précédente pour ce groupe", variant: "destructive" });
      return;
    }

      const imported: WeekSession[] = data.map(cs => {
        const scheduledDate = new Date(cs.scheduled_at);
        const dayOfWeek = scheduledDate.getDay();
        const dayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        const parsedBlocks = cs.rcc_code
          ? mergeStoredSessionBlocksIntoParsed(parseRCC(cs.rcc_code).blocks, cs.session_blocks)
          : [];
        return {
          dayIndex,
          activityType: cs.activity_type || "running",
          objective: cs.objective || cs.title || "",
          rccCode: cs.rcc_code || "",
          parsedBlocks,
          coachNotes: cs.coach_notes || "",
          locationName: cs.default_location_name || "",
          athleteOverrides: {},
          blockRpe: blockRpeFromCoachingRow(cs as { rpe?: number | null; rpe_phases?: unknown }, parsedBlocks.length),
        };
      });

    setSessions(() => imported);
    setSelectedIndex(null);
    toast({ title: "Semaine précédente chargée", description: `${imported.length} séances importées` });
  };

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
          const { blocks: freshBlocks } = parseRCC(session.rccCode);
          const mergedBlocks = mergeParsedBlocksByIndex(freshBlocks, session.parsedBlocks || []);
          const rawBlocks = rccToSessionBlocks(mergedBlocks);
          const resolvedRpe = resolveSessionRpeForInsert(null, rawBlocks, session.blockRpe);
          const sessionBlocks = stripPerBlockRpeFromSessionBlocks(rawBlocks);

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
              session_blocks: (sessionBlocks as any[]).length > 0 ? sessionBlocks : null,
              default_location_name: session.locationName || null,
              send_mode: sendMode,
              target_athletes: Object.keys(session.athleteOverrides || {}).length > 0 ? Object.keys(session.athleteOverrides) : [],
              target_group_id: targetGroupDbId,
              rpe: resolvedRpe,
              rpe_phases: blockRpeToJson(session.blockRpe),
            } as any)
            .select("id")
            .single();

          if (error) throw error;

          if (created && targetMembers.length > 0) {
            // If specific athletes were selected via overrides, only send to them
            const overrideKeys = Object.keys(session.athleteOverrides || {});
            const effectiveMembers = overrideKeys.length > 0
              ? targetMembers.filter(m => overrideKeys.includes(m.user_id))
              : targetMembers;
            const participations = effectiveMembers.map(m => ({
              coaching_session_id: created.id,
              user_id: m.user_id,
              status: "sent",
              athlete_overrides: JSON.parse(JSON.stringify(session.athleteOverrides[m.user_id] || {})),
            }));
            const { error: partError } = await supabase.from("coaching_participations").insert(participations);
            if (partError) {
              console.error("Error creating participations:", partError);
              throw new Error(`Erreur lors de l'assignation aux athlètes: ${partError.message}`);
            }
          } else if (targetMembers.length === 0) {
            console.warn("No target members found for group:", groupId);
          }
        }
      }

      const { data: coachProfile } = await supabase
        .from("profiles")
        .select("display_name, username")
        .eq("user_id", user.id)
        .single();
      const coachName = coachProfile?.display_name || coachProfile?.username || "Coach";
      const weekLabel = format(weekStart, "d MMM", { locale: fr });

      const notifiedSet = new Set<string>();
      for (const [groupId, groupSessions] of Object.entries(groupPlans)) {
        if (groupSessions.length === 0) continue;
        const allGroupMembers = getMembersForGroup(groupId);
        // Collect all athletes that actually received sessions in this group
        const athletesInGroup = new Set<string>();
        for (const s of groupSessions) {
          const overrideKeys = Object.keys(s.athleteOverrides || {});
          if (overrideKeys.length > 0) {
            overrideKeys.forEach(id => athletesInGroup.add(id));
          } else {
            allGroupMembers.forEach(m => athletesInGroup.add(m.user_id));
          }
        }
        for (const memberId of athletesInGroup) {
          if (notifiedSet.has(memberId)) continue;
          notifiedSet.add(memberId);
          await supabase.from("notifications").insert({
            user_id: memberId,
            type: "coaching_plan",
            title: "📋 Nouveau plan d'entraînement",
            message: `${coachName} vous a envoyé un plan pour la semaine du ${weekLabel}`,
            data: { club_id: clubId, week_start: format(weekStart, "yyyy-MM-dd") },
          });
          sendPushNotification(memberId, "📋 Nouveau plan", `Plan semaine du ${weekLabel}`, "coaching_plan");
        }
      }

      const groupLabels = groupsWithPlans.map(id =>
        id === "club" ? "Club" : groups.find(g => g.id === id)?.name || "Groupe"
      );
      const weekEndLabel = format(addDays(weekStart, 6), "d MMM", { locale: fr });
      toast({
        title: "Plan envoyé ! 🚀",
        description: `${totalSessionsCount} séances → ${groupLabels.join(", ")} (semaine du ${format(weekStart, "d MMM", { locale: fr })} au ${weekEndLabel})`,
      });
      setSentAt(new Date().toISOString());
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
          sent_at: new Date().toISOString(),
        } as any, { onConflict: "coach_id,club_id,week_start,group_id" } as any);
      }
      setSelectedIndex(null);
      setHasDraft(false);
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
  const [showMesocycle, setShowMesocycle] = useState(false);

  // Get base values from the selected session for override defaults
  const selectedSessionIntervalBlock = selectedSession?.parsedBlocks?.find(b => b.type === "interval");
  const globalBasePace = selectedSessionIntervalBlock?.pace;
  const globalBaseReps = selectedSessionIntervalBlock?.repetitions;
  const globalBaseRecovery = selectedSessionIntervalBlock?.recoveryDuration;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent fullScreen hideCloseButton className="flex min-h-0 flex-col gap-0 overflow-hidden p-0">
        <IosFixedPageHeaderShell
          className="min-h-0 flex-1"
          headerWrapperClassName="shrink-0"
          header={<CoachingFullscreenHeader title="Plan de semaine" onBack={onClose} />}
          scrollClassName="bg-secondary pb-24"
          footer={
            <div className="shrink-0 space-y-3 border-t border-border bg-card px-5 py-4 pb-[max(1rem,var(--safe-area-bottom))]">
              {draftSaveStatus !== "idle" && (
                <p className="text-[12px] text-muted-foreground text-center">
                  {draftSaveStatus === "saving" ? "Sauvegarde…" : "Brouillon sauvegardé"}
                </p>
              )}
              {totalSessionsCount > 0 && (
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <span className="text-[13px] text-muted-foreground">
                    {totalSessionsCount} séance{totalSessionsCount > 1 ? "s" : ""} →{" "}
                    {targetAthletes.length > 0
                      ? `${targetAthletes.length} athlète${targetAthletes.length > 1 ? "s" : ""}`
                      : groupsWithPlans
                          .map((id) =>
                            id === "club"
                              ? `Club (${members.length})`
                              : `${groups.find((g) => g.id === id)?.name} (${groups.find((g) => g.id === id)?.memberIds.length || 0})`
                          )
                          .join(", ")}
                  </span>
                </div>
              )}
              {activeGroupId === "club" && targetAthletes.length === 0 && totalSessionsCount > 0 && (
                <p className="text-center text-[12px] text-destructive">
                  Sélectionnez un groupe ou un athlète pour envoyer
                </p>
              )}
              <Button
                className="h-12 w-full rounded-xl text-[17px] font-semibold"
                onClick={handleSendPlan}
                disabled={
                  totalSessionsCount === 0 ||
                  sending ||
                  (activeGroupId === "club" && targetAthletes.length === 0)
                }
              >
                {sending ? (
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                ) : (
                  <Send className="mr-2 h-5 w-5" />
                )}
                {sentAt ? "Renvoyer" : "Envoyer"}{" "}
                {totalSessionsCount > 0 ? `${totalSessionsCount} séances` : "le plan"}
              </Button>
            </div>
          }
        >
          {/* ── Week navigator — hero card ── */}
          <div className="mt-4 mb-3 px-4">
            <div className="ios-card overflow-hidden border border-border/60 shadow-[var(--shadow-card)]">
              {/* Week selector */}
              <div className="flex items-center justify-between px-5 py-4">
                <button
                  onClick={() => setCurrentWeek(subWeeks(currentWeek, 1))}
                  className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center active:bg-muted transition-colors"
                >
                  <ChevronLeft className="h-5 w-5 text-foreground" />
                </button>
                <div className="text-center">
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Semaine du</p>
                  <p className="text-[20px] font-bold text-foreground mt-0.5">
                    {format(weekStart, "d MMM", { locale: fr })} — {format(addDays(weekStart, 6), "d MMM", { locale: fr })}
                  </p>
                </div>
                <button
                  onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))}
                  className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center active:bg-muted transition-colors"
                >
                  <ChevronRight className="h-5 w-5 text-foreground" />
                </button>
              </div>

              <div className="flex gap-2 px-4 pb-3">
                <button
                  type="button"
                  onClick={() => setPlannerView("week")}
                  className={`flex-1 rounded-xl py-2 text-[13px] font-semibold transition-colors ${
                    plannerView === "week" ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
                  }`}
                >
                  Semaine
                </button>
                <button
                  type="button"
                  onClick={() => setPlannerView("month")}
                  className={`flex-1 rounded-xl py-2 text-[13px] font-semibold transition-colors ${
                    plannerView === "month" ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
                  }`}
                >
                  Mois
                </button>
              </div>
            </div>
          </div>

          {plannerView === "month" ? (
            <div className="mb-3 px-4 space-y-2">
              <p className="text-[13px] font-semibold text-muted-foreground">Vue mensuelle</p>
              <MonthlyCalendarView
                monthDate={monthCursor}
                sessions={monthDbSessions}
                onPrevMonth={() => setMonthCursor((d) => addMonths(d, -1))}
                onNextMonth={() => setMonthCursor((d) => addMonths(d, 1))}
              />
              <p className="text-[12px] text-center text-muted-foreground px-2">
                Séances déjà envoyées (même filtre club / groupe). Pour modifier, passez à Semaine.
              </p>
            </div>
          ) : (
            <>
          {/* ── Search bar ── */}
          <div className="px-4 mb-3">
            <Input
              placeholder="Rechercher un athlète ou un groupe…"
              value={athleteSearch}
              onChange={e => setAthleteSearch(e.target.value)}
              className="h-11 text-[16px] rounded-xl bg-card border-border"
            />

            {/* Selected group chip */}
            {activeGroupId !== "club" && (
              <div className="flex flex-wrap gap-2 mt-2.5">
                {(() => {
                  const g = groups.find(g => g.id === activeGroupId);
                  if (!g) return null;
                  return (
                    <button
                      onClick={() => { setActiveGroupId("club"); setSelectedIndex(null); }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-accent text-accent-foreground text-[13px] font-medium active:opacity-70"
                    >
                      <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: g.color }} />
                      {g.name}
                      <X className="h-3.5 w-3.5" />
                    </button>
                  );
                })()}
              </div>
            )}

            {/* Selected athlete chips */}
            {targetAthletes.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2.5">
                {targetAthletes.map(id => {
                  const m = members.find(m => m.user_id === id);
                  return (
                    <button
                      key={id}
                      onClick={() => setTargetAthletes(prev => prev.filter(a => a !== id))}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-[13px] font-medium active:opacity-70"
                    >
                      {m?.display_name || "Athlète"}
                      <X className="h-3.5 w-3.5" />
                    </button>
                  );
                })}
              </div>
            )}

            {/* Unified search results */}
            {athleteSearch.trim().length > 0 && (
              <div className="bg-card rounded-xl border border-border mt-2 max-h-48 overflow-y-auto" style={{ boxShadow: 'var(--shadow-sm)' }}>
                {groups
                  .filter(g => g.name.toLowerCase().includes(athleteSearch.toLowerCase()))
                  .map(g => (
                    <button
                      key={`group-${g.id}`}
                      onClick={() => {
                        setActiveGroupId(g.id);
                        setSelectedIndex(null);
                        setAthleteSearch("");
                      }}
                      className="w-full text-left px-4 py-3 text-[15px] text-foreground active:bg-muted transition-colors border-b border-border last:border-0 flex items-center gap-2.5"
                    >
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: g.color }} />
                      <span className="font-medium">{g.name}</span>
                      <span className="text-[13px] text-muted-foreground ml-auto">Groupe · {g.memberIds.length}</span>
                    </button>
                  ))
                }
                {members
                  .filter(m =>
                    m.display_name.toLowerCase().includes(athleteSearch.toLowerCase()) &&
                    !targetAthletes.includes(m.user_id)
                  )
                  .slice(0, 5)
                  .map(m => (
                    <button
                      key={m.user_id}
                      onClick={() => {
                        setTargetAthletes(prev => [...prev, m.user_id]);
                        setAthleteSearch("");
                      }}
                      className="w-full text-left px-4 py-3 text-[15px] text-foreground active:bg-muted transition-colors border-b border-border last:border-0"
                    >
                      {m.display_name}
                    </button>
                  ))
                }
                {groups.filter(g => g.name.toLowerCase().includes(athleteSearch.toLowerCase())).length === 0 &&
                 members.filter(m => m.display_name.toLowerCase().includes(athleteSearch.toLowerCase()) && !targetAthletes.includes(m.user_id)).length === 0 && (
                  <p className="px-4 py-3 text-[14px] text-muted-foreground">Aucun résultat</p>
                )}
              </div>
            )}
          </div>

          {/* ── CHARGE DE LA SEMAINE (moved BEFORE calendar) ── */}
          {weekLoadSummary && (
            <div className="mb-3 px-4">
              <p className="mb-2 text-[13px] font-semibold text-muted-foreground">Charge de la semaine</p>
              <div className="ios-card border border-border/60 shadow-[var(--shadow-card)] p-3">
                {/* Compact stats row */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <BarChart3 className="h-4 w-4 text-primary" />
                    </div>
                    <p className="text-[18px] font-bold text-foreground leading-none">{weekLoadSummary.totalKm} <span className="text-[13px] font-medium text-muted-foreground">km</span></p>
                  </div>
                  <div className="flex items-center gap-3 text-[13px]">
                    <div className="text-center">
                      <p className="text-[16px] font-bold text-foreground">{sessions.length}</p>
                      <p className="text-[10px] text-muted-foreground">séances</p>
                    </div>
                    {weekLoadSummary.qualitySessions > 0 && (
                      <div className="text-center">
                        <p className="text-[16px] font-bold text-orange-500">{weekLoadSummary.qualitySessions}</p>
                        <p className="text-[10px] text-muted-foreground">qualité</p>
                      </div>
                    )}
                    <Badge variant={
                      weekLoadSummary.intensity === 'Très intense' ? 'destructive' :
                      weekLoadSummary.intensity === 'Intense' ? 'default' :
                      'secondary'
                    } className="text-[11px] px-2 py-0.5">
                      {weekLoadSummary.intensity}
                    </Badge>
                  </div>
                </div>

                {/* Compact bar chart — height reduced to 48px */}
                {(() => {
                  const maxCharge = Math.max(...dailyCharge, 1);
                  return (
                    <div className="flex items-end gap-2" style={{ height: 48 }}>
                      {DAY_LABELS.map((label, i) => {
                        const val = dailyCharge[i];
                        const pct = (val / maxCharge) * 100;
                        const daySessions = (sessionsByDay[i] || []).map(idx => sessions[idx]);
                        const hasIntense = daySessions.some(s => {
                          const obj = (s.objective || s.activityType || "").toLowerCase();
                          return obj.includes("vma") || obj.includes("seuil") || obj.includes("interval") || obj.includes("fractionné") || obj.includes("pma");
                        });
                        const barColor = val === 0 ? "bg-muted" : hasIntense ? "bg-primary/75" : "bg-primary/35";
                        return (
                          <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                            <div className="w-full flex items-end justify-center" style={{ height: 36 }}>
                              <div
                                className={`w-full max-w-[20px] rounded-t-md transition-all ${barColor}`}
                                style={{ height: val > 0 ? `${Math.max(pct, 12)}%` : 3 }}
                              />
                            </div>
                            <span className="text-[10px] font-medium text-muted-foreground">{label}</span>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {/* ── CALENDAR GRID (moved AFTER charge) ── */}
          <div className="mb-3 px-4">
            <p className="mb-2 text-[13px] font-semibold text-muted-foreground">Calendrier</p>
            <div className="ios-card border border-border/60 shadow-[var(--shadow-card)] p-4">
              <div className="grid grid-cols-7 gap-2">
                {DAY_LABELS.map((label, dayIndex) => {
                  const daySessions = sessionsByDay[dayIndex] || [];
                  const dayDate = addDays(weekStart, dayIndex);
                  const isToday = format(dayDate, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");
                  return (
                    <div key={dayIndex} className="flex flex-col items-center gap-1.5">
                      <span className={`text-[11px] font-semibold uppercase ${isToday ? "text-primary" : "text-muted-foreground"}`}>
                        {label}
                      </span>
                      <span className={`text-[13px] font-medium w-7 h-7 flex items-center justify-center rounded-full ${
                        isToday ? "bg-primary text-primary-foreground" : "text-foreground"
                      }`}>
                        {format(dayDate, "d")}
                      </span>
                      {daySessions.map(sIdx => {
                        const s = sessions[sIdx];
                        const obj = (s.objective || s.activityType || "").toLowerCase();
                        let pillTone =
                          "border border-border/70 bg-secondary text-foreground";
                        let pillLabel = "EF";
                        if (obj.includes("vma") || obj.includes("interval") || obj.includes("fractionné") || obj.includes("pma")) {
                          pillTone = "border border-destructive/30 bg-destructive/10 text-destructive";
                          pillLabel = obj.includes("pma") ? "PMA" : "VMA";
                        } else if (obj.includes("seuil")) {
                          pillTone = "border border-orange-500/35 bg-orange-500/10 text-orange-700 dark:text-orange-300";
                          pillLabel = "SEU";
                        } else if (obj.includes("récup") || obj.includes("recup")) {
                          pillTone = "border border-primary/25 bg-primary/8 text-primary";
                          pillLabel = "REC";
                        } else if (obj.includes("spé") || obj.includes("specifique")) {
                          pillTone = "border border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-300";
                          pillLabel = "SPÉ";
                        } else if (s.objective) {
                          pillLabel = s.objective.slice(0, 3).toUpperCase();
                        }
                        const isSelected = selectedIndex === sIdx;
                        return (
                          <button
                            key={sIdx}
                            onClick={() => setSelectedIndex(sIdx)}
                            className={`w-full rounded-lg py-1.5 text-[10px] font-semibold transition-all ${pillTone} ${
                              isSelected ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : "active:opacity-90"
                            }`}
                          >
                            {pillLabel}
                          </button>
                        );
                      })}
                      <button
                        onClick={() => addSession(dayIndex)}
                        className="w-full py-1.5 rounded-lg border-2 border-dashed border-border text-muted-foreground hover:bg-muted active:bg-muted transition-colors flex items-center justify-center"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ── Éditeur de séance ── */}
          {selectedSession && selectedIndex !== null ? (
            <div className="mb-3 px-4">
              <p className="mb-2 text-[13px] font-semibold text-muted-foreground">Éditer la séance</p>
              <div className="ios-card border border-border/60 shadow-[var(--shadow-card)] overflow-hidden">
                <WeeklyPlanSessionEditor
                  session={selectedSession}
                  onChange={s => updateSession(selectedIndex, s)}
                  onDuplicate={targetDay => duplicateToDay(selectedIndex, targetDay)}
                  onDelete={() => deleteSession(selectedIndex)}
                  members={getMembersForGroup(activeGroupId)}
                />
              </div>
            </div>
          ) : (
            <div className="px-4 mb-3 py-10 text-center">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                <Plus className="h-7 w-7 text-primary" />
              </div>
              <p className="text-[17px] font-semibold text-foreground">Ajouter une séance</p>
              <p className="text-[14px] text-muted-foreground mt-1">Appuyez sur <strong>+</strong> dans le calendrier<br />ou utilisez le bouton bleu</p>
            </div>
          )}

          {/* ── ACTIONS section ── */}
          <div className="mb-3 px-4">
            <p className="mb-2 text-[13px] font-semibold text-muted-foreground">Outils</p>
            <div className="ios-card border border-border/60 shadow-[var(--shadow-card)] overflow-hidden">
              {/* Resume draft button */}
              {hasDraft && (
                <IOSListItem
                  icon={FileText}
                  iconBgColor="bg-purple-500"
                  title="Reprendre le brouillon"
                  subtitle="Un brouillon non envoyé existe"
                  onClick={loadDraft}
                  showSeparator
                />
              )}
              <IOSListItem
                icon={History}
                iconBgColor="bg-amber-500"
                title="Dupliquer semaine précédente"
                subtitle="Charger les séances de S-1"
                onClick={loadPreviousWeek}
                showSeparator
              />
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
                <div key={t.id} className="flex items-center justify-between px-5 py-3 bg-card border-b border-border last:border-0">
                  <button
                    onClick={() => { loadTemplate(t); setShowTemplateList(false); }}
                    className="text-[16px] text-primary flex-1 text-left font-medium"
                  >
                    {t.name} ({t.sessions.length}s)
                  </button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive"
                    onClick={() => deleteTemplate(t.id)}
                  >
                    <Trash2 className="h-4 w-4" />
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
                    <div key={g.id} className="px-5 py-3 bg-card border-b border-border last:border-0">
                      <button
                        onClick={() => { duplicatePlanToGroup(g.id); setShowDupDropdown(false); }}
                        className="text-[16px] text-primary flex items-center gap-2.5 w-full text-left font-medium"
                      >
                        {g.id !== "club" && (
                          <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: g.color }} />
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
                  showSeparator
                />
              )}
              <IOSListItem
                icon={TrendingUp}
                iconBgColor="bg-indigo-500"
                title="Vue mesocycle (8 sem.)"
                subtitle="Progression volume et intensité"
                onClick={() => setShowMesocycle(!showMesocycle)}
                showSeparator={false}
              />
            </div>
          </div>

          {/* Mesocycle panel */}
          {showMesocycle && (
            <div className="mb-3 px-4">
              <div className="ios-card border border-border/60 p-4 shadow-[var(--shadow-card)]">
                <MesocycleView clubId={clubId} currentWeek={currentWeek} />
              </div>
            </div>
          )}

          {/* Save template input */}
          {showSaveTemplate && (
            <div className="mb-3 px-4">
              <div className="ios-card overflow-hidden border border-border/60 shadow-[var(--shadow-card)]">
                <div className="px-5 py-4 flex items-center gap-3">
                  <Input
                    value={templateName}
                    onChange={e => setTemplateName(e.target.value)}
                    placeholder="Nom de la semaine type..."
                    className="h-11 text-[16px] flex-1 rounded-xl"
                    autoFocus
                    onKeyDown={e => e.key === "Enter" && saveAsTemplate()}
                  />
                  <Button size="sm" className="h-11 px-4 text-[14px] rounded-xl" onClick={saveAsTemplate} disabled={!templateName.trim()}>
                    <Save className="h-4 w-4 mr-1.5" />
                    Sauver
                  </Button>
                  <Button variant="ghost" size="icon" className="h-11 w-11" onClick={() => setShowSaveTemplate(false)}>
                    <X className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* ── AJUSTEMENTS ATHLÈTES section ── */}
          {selectedSession && selectedIndex !== null && sessions.length > 0 && (
            <div className="mb-3 px-4">
              <p className="mb-2 text-[13px] font-semibold text-muted-foreground">Personnalisation</p>
              <div className="ios-card border border-border/60 shadow-[var(--shadow-card)] overflow-hidden">
                <Collapsible open={showAthleteOverrides} onOpenChange={setShowAthleteOverrides}>
                  <CollapsibleTrigger asChild>
                    <div className="px-5 py-4 flex items-center justify-between cursor-pointer active:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/15 text-violet-700 dark:text-violet-300">
                          <Users className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-[16px] font-semibold text-foreground">
                            Personnaliser les allures
                          </p>
                          <p className="text-[13px] text-muted-foreground mt-0.5">
                            {Object.keys(selectedSession.athleteOverrides).length > 0
                              ? `${Object.keys(selectedSession.athleteOverrides).length} athlète${Object.keys(selectedSession.athleteOverrides).length > 1 ? "s" : ""} personnalisé${Object.keys(selectedSession.athleteOverrides).length > 1 ? "s" : ""}`
                              : `${DAY_LABELS[selectedSession.dayIndex]} — ${selectedSession.objective || "séance"}`
                            }
                          </p>
                        </div>
                      </div>
                      <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform ${showAthleteOverrides ? "rotate-180" : ""}`} />
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="px-5 py-4 border-t border-border">
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
              </div>
            </div>
          )}

            </>
          )}

          {/* FAB */}
          {plannerView === "week" && (
          <button
            onClick={() => {
              const todayDow = new Date().getDay();
              const dayIndex = todayDow === 0 ? 6 : todayDow - 1;
              addSession(dayIndex);
            }}
            className="fixed right-5 z-20 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform active:scale-95 bottom-[max(7rem,calc(6.5rem+var(--safe-area-bottom)))]"
            style={{ boxShadow: "0 6px 20px hsl(var(--primary) / 0.35)" }}
          >
            <Plus className="h-7 w-7" />
          </button>
          )}
        </IosFixedPageHeaderShell>
      </DialogContent>
    </Dialog>
  );
};
