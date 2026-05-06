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
import { ChevronLeft, ChevronRight, Plus, Send, Loader2, Copy, Save, FolderOpen, Trash2, X, Users, ChevronDown, BarChart3, History, FileText, Search, Clock3, MapPin, PersonStanding } from "lucide-react";
import { useSendNotification } from "@/hooks/useSendNotification";
import { format, startOfWeek, addWeeks, subWeeks, addDays, startOfMonth, endOfMonth, addMonths, getISOWeek } from "date-fns";
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
  const infiniteScrollRef = useRef<HTMLDivElement | null>(null);
  const [weekOffsets, setWeekOffsets] = useState<number[]>([-2, -1, 0, 1, 2]);
  const ROW_ESTIMATED_HEIGHT = 500;
  const athleteReadonlyMode = Boolean(initialAthleteId || initialAthleteName);

  // Get base values from the selected session for override defaults
  const selectedSessionIntervalBlock = selectedSession?.parsedBlocks?.find(b => b.type === "interval");
  const globalBasePace = selectedSessionIntervalBlock?.pace;
  const globalBaseReps = selectedSessionIntervalBlock?.repetitions;
  const globalBaseRecovery = selectedSessionIntervalBlock?.recoveryDuration;

  useEffect(() => {
    if (!isOpen || plannerView !== "week") return;
    setWeekOffsets([-2, -1, 0, 1, 2]);
    const container = infiniteScrollRef.current;
    if (!container) return;
    requestAnimationFrame(() => {
      container.scrollTop = ROW_ESTIMATED_HEIGHT * 2;
    });
  }, [isOpen, plannerView]);

  const getSessionMetrics = useCallback((s: WeekSession) => {
    if (!s.rccCode) return { duration: 0, distance: 0 };
    const summary = computeRCCSummary(parseRCC(s.rccCode).blocks);
    return {
      duration: Math.max(0, Math.round(summary.totalDurationMin || 0)),
      distance: Math.max(0, Math.round((summary.totalDistanceKm || 0) * 10) / 10),
    };
  }, []);

  const renderLoadBars = (s: WeekSession) => {
    const bars = 13;
    const filled = Math.max(2, Math.min(12, (s.parsedBlocks?.length || 0) + 2));
    return Array.from({ length: bars }).map((_, i) => {
      const isEdge = i === 0 || i === bars - 1;
      const active = i < filled;
      return (
        <span
          key={`${s.dayIndex}-${i}`}
          className={`h-7 w-6 rounded-[3px] ${active ? "bg-[#b8d4f4]" : "bg-[#c9c9cf]"} ${isEdge ? "h-6 w-5" : ""}`}
        />
      );
    });
  };

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
            <div className="px-4 pb-4">
              {!athleteReadonlyMode ? (
                <div className="mb-4">
                  <div className="flex items-center gap-2 rounded-[16px] bg-[#d7d7dd] px-4 py-3">
                    <Search className="h-5 w-5 text-muted-foreground" />
                    <Input
                      value={athleteSearch}
                      onChange={(e) => setAthleteSearch(e.target.value)}
                      placeholder="Rechercher un athlète ou un groupe"
                      className="h-auto border-0 bg-transparent p-0 text-[18px] shadow-none focus-visible:ring-0"
                    />
                  </div>
                </div>
              ) : null}

              <div
                ref={infiniteScrollRef}
                onScroll={(e) => {
                  const el = e.currentTarget;
                  if (el.scrollTop < 120) {
                    setWeekOffsets((prev) => {
                      const min = prev[0] ?? 0;
                      const prepend = [min - 5, min - 4, min - 3, min - 2, min - 1];
                      requestAnimationFrame(() => {
                        if (infiniteScrollRef.current) {
                          infiniteScrollRef.current.scrollTop += ROW_ESTIMATED_HEIGHT * prepend.length;
                        }
                      });
                      return [...prepend, ...prev];
                    });
                  } else if (el.scrollHeight - el.scrollTop - el.clientHeight < 140) {
                    setWeekOffsets((prev) => {
                      const max = prev[prev.length - 1] ?? 0;
                      return [...prev, max + 1, max + 2, max + 3, max + 4, max + 5];
                    });
                  }
                }}
                className="h-[62vh] overflow-y-auto pr-1"
              >
                <div className="space-y-6">
                  {weekOffsets.map((offset) => {
                    const wk = addWeeks(weekStart, offset);
                    const wkStart = startOfWeek(wk, { weekStartsOn: 1 });
                    const isActiveWeek = format(wkStart, "yyyy-MM-dd") === format(weekStart, "yyyy-MM-dd");
                    const wkSessions = isActiveWeek ? sessions : [];
                    const wkByDay = isActiveWeek ? sessionsByDay : {};

                    return (
                      <section
                        key={format(wkStart, "yyyy-MM-dd")}
                        className="rounded-[18px] bg-transparent"
                        onClick={() => {
                          if (!isActiveWeek) {
                            setCurrentWeek(wkStart);
                            setSelectedIndex(null);
                          }
                        }}
                      >
                        <h3 className="text-[46px] font-bold leading-none text-foreground">
                          Semaine {getISOWeek(wkStart)}
                          <span className="ml-2 text-[31px] font-medium text-muted-foreground">
                            · {format(wkStart, "d", { locale: fr })} – {format(addDays(wkStart, 6), "d MMM", { locale: fr }).toUpperCase()}
                          </span>
                        </h3>
                        <p className="mb-3 mt-2 text-[31px] font-semibold text-foreground/90">
                          {isActiveWeek && weekLoadSummary ? `${weekLoadSummary.totalKm} km` : "0 km"}
                          <span className="ml-2 text-muted-foreground">
                            · {isActiveWeek && weekLoadSummary ? `${Math.floor(weekLoadSummary.totalDuration / 60)}h ${weekLoadSummary.totalDuration % 60}m` : "0h"}
                          </span>
                          <span className="ml-2 text-muted-foreground">
                            {` ${wkSessions.length} séance${wkSessions.length > 1 ? "s" : ""}`}
                          </span>
                        </p>

                        <div className="space-y-3">
                          {DAY_LABELS.map((dayLabel, dayIndex) => {
                            const dayDate = addDays(wkStart, dayIndex);
                            const daySessionIndexes = (wkByDay as Record<number, number[]>)[dayIndex] || [];
                            const daySession = daySessionIndexes.length > 0 ? wkSessions[daySessionIndexes[0]] : null;
                            const metrics = daySession ? getSessionMetrics(daySession) : { duration: 0, distance: 0 };

                            return (
                              <div key={`${offset}-${dayIndex}`} className="flex items-center gap-3">
                                <div
                                  className={`w-12 text-center ${format(new Date(), "yyyy-MM-dd") === format(dayDate, "yyyy-MM-dd") ? "rounded-2xl bg-[rgba(0,122,255,0.16)] py-2" : ""}`}
                                >
                                  <div
                                    className={`text-[13px] font-semibold uppercase ${
                                      format(new Date(), "yyyy-MM-dd") === format(dayDate, "yyyy-MM-dd")
                                        ? "text-[#007AFF]"
                                        : "text-muted-foreground"
                                    }`}
                                  >
                                    {dayLabel}
                                  </div>
                                  <div
                                    className={`text-[42px] font-bold leading-none ${
                                      format(new Date(), "yyyy-MM-dd") === format(dayDate, "yyyy-MM-dd")
                                        ? "text-[#007AFF]"
                                        : "text-foreground"
                                    }`}
                                  >
                                    {format(dayDate, "d")}
                                  </div>
                                </div>

                                <div className="min-w-0 flex-1">
                                  {daySession ? (
                                    <button
                                      onClick={(ev) => {
                                        ev.stopPropagation();
                                        if (isActiveWeek) setSelectedIndex(daySessionIndexes[0]);
                                      }}
                                      className="w-full overflow-hidden rounded-[20px] border border-border bg-card text-left shadow-sm"
                                    >
                                      <div className="flex items-center justify-between border-b border-border/80 px-4 py-3">
                                        <div className="flex items-center gap-2 text-[34px] font-semibold text-foreground">
                                          <PersonStanding className="h-5 w-5" />
                                          Détail
                                        </div>
                                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                                      </div>
                                      <div className="px-4 py-4">
                                        <div className="mb-3 flex items-end gap-1">{renderLoadBars(daySession)}</div>
                                        <p className="text-[35px] font-semibold text-foreground">
                                          {`${metrics.duration || 45}' ${daySession.objective || "Séance"}${daySession.rccCode ? "" : " Z2"}`}
                                        </p>
                                        <div className="mt-2 flex items-center gap-5 text-[28px] text-muted-foreground">
                                          <span className="inline-flex items-center gap-1.5">
                                            <Clock3 className="h-4 w-4" />
                                            {`${Math.floor(metrics.duration / 60)}h ${metrics.duration % 60}m`}
                                          </span>
                                          <span className="inline-flex items-center gap-1.5">
                                            <MapPin className="h-4 w-4" />
                                            {`${metrics.distance || 0} km`}
                                          </span>
                                        </div>
                                      </div>
                                    </button>
                                  ) : (
                                    <div className="rounded-[20px] border-2 border-dashed border-border px-5 py-5 text-center text-[36px] text-muted-foreground">
                                      Repos
                                    </div>
                                  )}
                                </div>

                                {!athleteReadonlyMode ? (
                                  <button
                                    onClick={(ev) => {
                                      ev.stopPropagation();
                                      if (!isActiveWeek) {
                                        setCurrentWeek(wkStart);
                                        setSelectedIndex(null);
                                        toast({ title: "Semaine activée", description: "Ajoute ensuite ta séance sur cette semaine." });
                                        return;
                                      }
                                      addSession(dayIndex);
                                    }}
                                    className="h-14 w-14 shrink-0 rounded-full bg-[#007AFF] text-white shadow-[0_8px_20px_rgba(0,122,255,.35)]"
                                  >
                                    <Plus className="mx-auto h-7 w-7" />
                                  </button>
                                ) : (
                                  <div className="h-14 w-14 shrink-0" aria-hidden />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </section>
                    );
                  })}
                </div>
              </div>

              {selectedSession && selectedIndex !== null && (
                <div className="mt-4 rounded-[16px] border border-border bg-card shadow-sm">
                  <WeeklyPlanSessionEditor
                    session={selectedSession}
                    onChange={(s) => updateSession(selectedIndex, s)}
                    onDuplicate={(targetDay) => duplicateToDay(selectedIndex, targetDay)}
                    onDelete={() => deleteSession(selectedIndex)}
                    members={getMembersForGroup(activeGroupId)}
                  />
                </div>
              )}
            </div>
          )}

        </IosFixedPageHeaderShell>
      </DialogContent>
    </Dialog>
  );
};
