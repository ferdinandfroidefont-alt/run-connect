import { useEffect, useMemo, useState } from "react";
import { addDays, addWeeks, format, isSameDay, startOfWeek, subWeeks } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Bike,
  Dumbbell,
  Flame,
  Leaf,
  Minus,
  Plus,
  SwatchBook,
  Waves,
  Zap,
} from "lucide-react";
import { IosFixedPageHeaderShell } from "@/components/layout/IosFixedPageHeaderShell";
import { IosPageHeaderBar } from "@/components/layout/IosPageHeaderBar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { WheelValuePickerModal } from "@/components/ui/ios-wheel-picker";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useEnhancedToast } from "@/hooks/useEnhancedToast";
import { useAppContext } from "@/contexts/AppContext";
import { useNavigate } from "react-router-dom";
import { PlanningHeader } from "@/components/coaching/planning/PlanningHeader";
import { PlanningSearchBar } from "@/components/coaching/planning/PlanningSearchBar";
import { WeekSelectorPremium } from "@/components/coaching/planning/WeekSelectorPremium";
import { DayPlanningRow } from "@/components/coaching/planning/DayPlanningRow";
import { AppDrawer, type CoachMenuKey } from "@/components/coaching/drawer/AppDrawer";

type SportType = "running" | "cycling" | "swimming" | "strength";
type BlockType = "warmup" | "interval" | "steady" | "recovery" | "cooldown";
type IntensityMode = "zones" | "rpe";
type ZoneKey = "Z1" | "Z2" | "Z3" | "Z4" | "Z5" | "Z6";

type SessionBlock = {
  id: string;
  order: number;
  type: BlockType;
  durationSec?: number;
  distanceM?: number;
  paceSecPerKm?: number;
  speedKmh?: number;
  powerWatts?: number;
  repetitions?: number;
  recoveryDurationSec?: number;
  recoveryDistanceM?: number;
  recoveryType?: "walk" | "jog" | "easy";
  intensityMode?: IntensityMode;
  zone?: ZoneKey;
  rpe?: number;
  notes?: string;
};

type TrainingSession = {
  id: string;
  dbId?: string;
  title: string;
  sport: SportType;
  assignedDate: string;
  athleteId?: string;
  groupId?: string;
  sent: boolean;
  blocks: SessionBlock[];
};

type SessionDraft = Omit<TrainingSession, "id" | "sent">;

const SPORTS: Array<{ id: SportType; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { id: "running", label: "Course à pied", icon: Flame },
  { id: "cycling", label: "Vélo", icon: Bike },
  { id: "swimming", label: "Natation", icon: Waves },
  { id: "strength", label: "Renforcement", icon: Dumbbell },
];

const BLOCK_TYPES: Array<{
  id: BlockType;
  label: string;
  detail: string;
  icon: React.ComponentType<{ className?: string }>;
  emoji: string;
  tone: string;
  iconTone: string;
}> = [
  {
    id: "warmup",
    label: "Échauffement",
    detail: "Montée progressive",
    icon: Flame,
    emoji: "🔥",
    tone: "border-orange-500/25 bg-orange-500/10",
    iconTone: "bg-orange-500/20 text-orange-700 dark:text-orange-300",
  },
  {
    id: "interval",
    label: "Intervalle",
    detail: "Effort + récup",
    icon: Zap,
    emoji: "⚡",
    tone: "border-red-500/25 bg-red-500/10",
    iconTone: "bg-red-500/20 text-red-700 dark:text-red-300",
  },
  {
    id: "steady",
    label: "Bloc continu",
    detail: "Effort stable",
    icon: Minus,
    emoji: "➖",
    tone: "border-yellow-500/25 bg-yellow-500/10",
    iconTone: "bg-yellow-500/20 text-yellow-700 dark:text-yellow-300",
  },
  {
    id: "recovery",
    label: "Récupération",
    detail: "Facile",
    icon: Waves,
    emoji: "💙",
    tone: "border-blue-500/25 bg-blue-500/10",
    iconTone: "bg-blue-500/20 text-blue-700 dark:text-blue-300",
  },
  {
    id: "cooldown",
    label: "Retour au calme",
    detail: "Descente progressive",
    icon: Leaf,
    emoji: "🌿",
    tone: "border-emerald-500/25 bg-emerald-500/10",
    iconTone: "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300",
  },
];

const ZONE_META: Array<{ zone: ZoneKey; label: string; description: string; tone: string }> = [
  { zone: "Z1", label: "Z1", description: "Récupération", tone: "bg-blue-500/12 text-blue-700 dark:text-blue-300" },
  { zone: "Z2", label: "Z2", description: "Endurance", tone: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300" },
  { zone: "Z3", label: "Z3", description: "Tempo", tone: "bg-yellow-500/12 text-yellow-700 dark:text-yellow-300" },
  { zone: "Z4", label: "Z4", description: "Seuil", tone: "bg-orange-500/12 text-orange-700 dark:text-orange-300" },
  { zone: "Z5", label: "Z5", description: "VO2max", tone: "bg-red-500/12 text-red-700 dark:text-red-300" },
  { zone: "Z6", label: "Z6", description: "Anaérobie", tone: "bg-violet-500/12 text-violet-700 dark:text-violet-300" },
];

type CoachClub = { id: string; name: string };
type AthleteEntry = { id: string; name: string };
type GroupEntry = { id: string; name: string };

const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

function secondsToLabel(total: number | undefined) {
  if (!total || total <= 0) return "";
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}h ${m.toString().padStart(2, "0")}m`;
  if (m > 0) return `${m} min`;
  return `${s} s`;
}

function metersToLabel(distance: number | undefined) {
  if (!distance || distance <= 0) return "";
  if (distance >= 1000) return `${(distance / 1000).toFixed(distance % 1000 === 0 ? 0 : 1)} km`;
  return `${distance} m`;
}

function paceToLabel(paceSecPerKm?: number) {
  if (!paceSecPerKm || paceSecPerKm <= 0) return "";
  const min = Math.floor(paceSecPerKm / 60);
  const sec = paceSecPerKm % 60;
  return `${min}:${sec.toString().padStart(2, "0")}/km`;
}

function blockTitle(type: BlockType) {
  return BLOCK_TYPES.find((b) => b.id === type)?.label ?? "Bloc";
}

function blockTypeMeta(type: BlockType) {
  return BLOCK_TYPES.find((b) => b.id === type) ?? BLOCK_TYPES[2];
}

function blockSummary(block: SessionBlock) {
  const volume = block.distanceM ? metersToLabel(block.distanceM) : secondsToLabel(block.durationSec);
  const target =
    block.paceSecPerKm ? paceToLabel(block.paceSecPerKm) :
    block.speedKmh ? `${block.speedKmh} km/h` :
    block.powerWatts ? `${block.powerWatts} W` : "";
  const intensity = block.intensityMode === "rpe"
    ? (block.rpe ? `RPE ${block.rpe}` : "")
    : (block.zone || "");
  if (block.type === "interval") {
    const reps = block.repetitions || 1;
    const rec = block.recoveryDurationSec
      ? `récup ${secondsToLabel(block.recoveryDurationSec)}`
      : block.recoveryDistanceM
      ? `récup ${metersToLabel(block.recoveryDistanceM)}`
      : "";
    return `${reps} x ${volume}${target ? ` à ${target}` : ""}${rec ? ` - ${rec}` : ""}${intensity ? ` - ${intensity}` : ""}`;
  }
  return `${volume}${target ? ` à ${target}` : ""}${intensity ? ` - ${intensity}` : ""}`;
}

function emptyDraft(dateIso: string): SessionDraft {
  return {
    title: "",
    sport: "running",
    assignedDate: dateIso,
    blocks: [],
  };
}

export function CoachPlanningExperience() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { setHideBottomNav } = useAppContext();
  const toast = useEnhancedToast();
  const [weekAnchor, setWeekAnchor] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [search, setSearch] = useState("");
  const [clubs, setClubs] = useState<CoachClub[]>([]);
  const [activeClubId, setActiveClubId] = useState<string | null>(null);
  const [athletes, setAthletes] = useState<AthleteEntry[]>([]);
  const [groups, setGroups] = useState<GroupEntry[]>([]);
  const [groupMembers, setGroupMembers] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(false);
  const [sessions, setSessions] = useState<TrainingSession[]>([]);
  const [activeAthleteId, setActiveAthleteId] = useState<string | undefined>(undefined);
  const [activeGroupId, setActiveGroupId] = useState<string | undefined>(undefined);
  const [coachingTab, setCoachingTab] = useState<"planning" | "create">("planning");
  const [editorTab, setEditorTab] = useState<"build" | "library" | "templates">("build");
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [draft, setDraft] = useState<SessionDraft>(() => emptyDraft(new Date().toISOString()));
  const [blockSheetOpen, setBlockSheetOpen] = useState(false);
  const [blockStep, setBlockStep] = useState<"type" | "config">("type");
  const [blockForm, setBlockForm] = useState<SessionBlock | null>(null);
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  const [wheelOpen, setWheelOpen] = useState(false);
  const [wheelTitle, setWheelTitle] = useState("");
  const [wheelItems, setWheelItems] = useState<Array<{ value: string; label: string }>>([]);
  const [wheelValue, setWheelValue] = useState("0");
  const [applyWheel, setApplyWheel] = useState<((next: string) => void) | null>(null);
  const [savePulse, setSavePulse] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeMenuKey, setActiveMenuKey] = useState<CoachMenuKey>("planning");
  const [unreadMessages, setUnreadMessages] = useState(0);

  useEffect(() => {
    setHideBottomNav(false);
    return () => setHideBottomNav(false);
  }, [setHideBottomNav]);

  useEffect(() => {
    setHideBottomNav(false);
  }, [coachingTab, setHideBottomNav]);

  useEffect(() => {
    if (!user) return;
    let ignore = false;
    const loadUnread = async () => {
      const { data: conversations } = await supabase
        .from("conversations")
        .select("id")
        .or(`participant_1.eq.${user.id},participant_2.eq.${user.id}`);
      const conversationIds = (conversations || []).map((conv) => conv.id);
      if (!conversationIds.length) {
        if (!ignore) setUnreadMessages(0);
        return;
      }
      const { count } = await supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .in("conversation_id", conversationIds)
        .neq("sender_id", user.id)
        .is("read_at", null);
      if (!ignore) setUnreadMessages(count || 0);
    };
    void loadUnread();
    return () => {
      ignore = true;
    };
  }, [user]);

  useEffect(() => {
    if (!user) return;
    let ignore = false;
    const loadCoachClubs = async () => {
      const { data: memberships } = await supabase
        .from("group_members")
        .select("conversation_id, is_coach")
        .eq("user_id", user.id);
      const clubIds = (memberships || [])
        .filter((entry) => entry.is_coach)
        .map((entry) => entry.conversation_id);
      if (!clubIds.length) {
        if (!ignore) {
          setClubs([]);
          setActiveClubId(null);
        }
        return;
      }
      const { data: conversations } = await supabase
        .from("conversations")
        .select("id, group_name")
        .in("id", clubIds)
        .order("group_name", { ascending: true });
      if (ignore) return;
      const nextClubs = (conversations || []).map((club) => ({
        id: club.id,
        name: club.group_name || "Club",
      }));
      setClubs(nextClubs);
      setActiveClubId((prev) => prev ?? nextClubs[0]?.id ?? null);
    };
    void loadCoachClubs();
    return () => {
      ignore = true;
    };
  }, [user]);

  useEffect(() => {
    if (!activeClubId) return;
    let ignore = false;
    const loadClubFilters = async () => {
      const { data: members } = await supabase
        .from("group_members")
        .select("user_id")
        .eq("conversation_id", activeClubId);
      const memberIds = (members || []).map((m) => m.user_id);
      const { data: profiles } = memberIds.length
        ? await supabase.from("profiles").select("user_id, display_name").in("user_id", memberIds)
        : { data: [] };
      const { data: clubGroups } = await supabase
        .from("club_groups")
        .select("id, name")
        .eq("club_id", activeClubId)
        .order("name", { ascending: true });
      const groupIds = (clubGroups || []).map((group) => group.id);
      const { data: memberships } = groupIds.length
        ? await supabase.from("club_group_members").select("group_id, user_id").in("group_id", groupIds)
        : { data: [] };
      const membersByGroup = (memberships || []).reduce<Record<string, string[]>>((acc, row) => {
        if (!acc[row.group_id]) acc[row.group_id] = [];
        acc[row.group_id].push(row.user_id);
        return acc;
      }, {});
      if (ignore) return;
      setAthletes(
        (profiles || []).map((profile) => ({
          id: profile.user_id,
          name: profile.display_name || "Athlète",
        }))
      );
      setGroups((clubGroups || []).map((group) => ({ id: group.id, name: group.name })));
      setGroupMembers(membersByGroup);
    };
    void loadClubFilters();
    return () => {
      ignore = true;
    };
  }, [activeClubId]);

  useEffect(() => {
    if (!activeClubId || !user) return;
    let ignore = false;
    const loadWeekSessions = async () => {
      setLoading(true);
      const weekEnd = addDays(weekAnchor, 7);
      let query = supabase
        .from("coaching_sessions")
        .select("id, title, activity_type, scheduled_at, status, target_athletes, target_group_id, session_blocks")
        .eq("club_id", activeClubId)
        .eq("coach_id", user.id)
        .gte("scheduled_at", weekAnchor.toISOString())
        .lt("scheduled_at", weekEnd.toISOString());
      if (activeGroupId) query = query.eq("target_group_id", activeGroupId);
      if (activeAthleteId) query = query.contains("target_athletes", [activeAthleteId]);
      const { data, error } = await query.order("scheduled_at", { ascending: true });
      if (!ignore) {
        if (error) {
          toast.error("Impossible de charger la semaine");
        } else {
          const mapped = (data || []).map<TrainingSession>((row) => {
            const rawBlocks = Array.isArray(row.session_blocks) ? row.session_blocks : [];
            const blocks = rawBlocks.map((block, index) => {
              const source = block as Record<string, unknown>;
              const intensityMode = source.intensityMode === "rpe" ? "rpe" : "zones";
              const zoneValue = typeof source.zone === "string" ? source.zone : undefined;
              const zone = zoneValue && ["Z1", "Z2", "Z3", "Z4", "Z5", "Z6"].includes(zoneValue) ? (zoneValue as ZoneKey) : undefined;
              return {
                id: typeof source.id === "string" ? source.id : uid(),
                order: typeof source.order === "number" ? source.order : index + 1,
                type: (typeof source.type === "string" ? source.type : "steady") as BlockType,
                durationSec: typeof source.durationSec === "number" ? source.durationSec : undefined,
                distanceM: typeof source.distanceM === "number" ? source.distanceM : undefined,
                paceSecPerKm: typeof source.paceSecPerKm === "number" ? source.paceSecPerKm : undefined,
                speedKmh: typeof source.speedKmh === "number" ? source.speedKmh : undefined,
                powerWatts: typeof source.powerWatts === "number" ? source.powerWatts : undefined,
                repetitions: typeof source.repetitions === "number" ? source.repetitions : undefined,
                recoveryDurationSec: typeof source.recoveryDurationSec === "number" ? source.recoveryDurationSec : undefined,
                recoveryDistanceM: typeof source.recoveryDistanceM === "number" ? source.recoveryDistanceM : undefined,
                recoveryType:
                  source.recoveryType === "walk" || source.recoveryType === "jog" || source.recoveryType === "easy"
                    ? source.recoveryType
                    : undefined,
                intensityMode,
                zone,
                rpe: typeof source.rpe === "number" ? source.rpe : undefined,
                notes: typeof source.notes === "string" ? source.notes : undefined,
              } satisfies SessionBlock;
            });
            const targetAthlete = row.target_athletes && row.target_athletes.length ? row.target_athletes[0] : undefined;
            return {
              id: row.id,
              dbId: row.id,
              title: row.title,
              sport: (row.activity_type as SportType) || "running",
              assignedDate: row.scheduled_at,
              athleteId: targetAthlete,
              groupId: row.target_group_id || undefined,
              sent: row.status === "sent",
              blocks,
            };
          });
          setSessions(mapped);
        }
        setLoading(false);
      }
    };
    void loadWeekSessions();
    return () => {
      ignore = true;
    };
  }, [activeClubId, activeAthleteId, activeGroupId, user, weekAnchor, toast]);

  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekAnchor, i)),
    [weekAnchor]
  );

  const searchResults = useMemo(() => {
    if (!search.trim()) return { athletes: [], groups: [] };
    const q = search.toLowerCase();
    return {
      athletes: athletes.filter((a) => a.name.toLowerCase().includes(q)),
      groups: groups.filter((g) => g.name.toLowerCase().includes(q)),
    };
  }, [athletes, groups, search]);

  const filteredSessions = useMemo(
    () => sessions.filter((s) => {
      if (activeAthleteId && s.athleteId !== activeAthleteId) return false;
      if (activeGroupId && s.groupId !== activeGroupId) return false;
      return true;
    }),
    [sessions, activeAthleteId, activeGroupId]
  );

  const totalDurationSec = useMemo(
    () => draft.blocks.reduce((acc, block) => acc + (block.durationSec || 0) * (block.repetitions || 1), 0),
    [draft.blocks]
  );
  const totalDistanceM = useMemo(
    () => draft.blocks.reduce((acc, block) => acc + (block.distanceM || 0) * (block.repetitions || 1), 0),
    [draft.blocks]
  );

  const openCreateForDate = (date: Date) => {
    setEditingSessionId(null);
    setDraft(emptyDraft(date.toISOString()));
    setEditorTab("build");
    setCoachingTab("create");
  };

  const openEditSession = (sessionId: string) => {
    const existing = sessions.find((s) => s.id === sessionId);
    if (!existing) return;
    setEditingSessionId(existing.id);
    setDraft({
      title: existing.title,
      sport: existing.sport,
      assignedDate: existing.assignedDate,
      athleteId: existing.athleteId,
      groupId: existing.groupId,
      blocks: [...existing.blocks].sort((a, b) => a.order - b.order),
    });
    setEditorTab("build");
    setCoachingTab("create");
  };

  const saveSession = async () => {
    if (!draft.blocks.length || !activeClubId || !user) return;
    const normalizedTitle = draft.title.trim() || "Séance sans titre";
    const totalDistanceKm = draft.blocks.reduce((acc, block) => acc + (block.distanceM || 0) * (block.repetitions || 1), 0) / 1000;
    const targetAthletes = draft.athleteId ? [draft.athleteId] : activeAthleteId ? [activeAthleteId] : null;
    const dbPayload = {
      club_id: activeClubId,
      coach_id: user.id,
      title: normalizedTitle,
      objective: normalizedTitle,
      activity_type: draft.sport,
      scheduled_at: draft.assignedDate,
      target_group_id: draft.groupId || activeGroupId || null,
      target_athletes: targetAthletes,
      send_mode: draft.groupId || activeGroupId ? "group" : "club",
      status: "draft",
      session_blocks: draft.blocks,
      distance_km: Number.isFinite(totalDistanceKm) && totalDistanceKm > 0 ? totalDistanceKm : null,
    };
    let dbId = editingSessionId;
    if (editingSessionId) {
      const { error } = await supabase.from("coaching_sessions").update(dbPayload).eq("id", editingSessionId);
      if (error) {
        toast.error("Enregistrement impossible", error.message);
        return;
      }
    } else {
      const { data, error } = await supabase.from("coaching_sessions").insert(dbPayload).select("id").single();
      if (error) {
        toast.error("Création impossible", error.message);
        return;
      }
      dbId = data.id;
    }
    const payload: TrainingSession = {
      id: dbId ?? uid(),
      dbId: dbId ?? undefined,
      title: normalizedTitle,
      sport: draft.sport,
      assignedDate: draft.assignedDate,
      athleteId: draft.athleteId ?? activeAthleteId,
      groupId: draft.groupId ?? activeGroupId,
      sent: editingSessionId ? sessions.find((s) => s.id === editingSessionId)?.sent ?? false : false,
      blocks: draft.blocks.map((b, idx) => ({ ...b, order: idx + 1 })),
    };
    setSessions((prev) => {
      if (!editingSessionId) return [...prev, payload];
      return prev.map((item) => (item.id === editingSessionId ? payload : item));
    });
    setCoachingTab("planning");
    setSavePulse(true);
    window.setTimeout(() => setSavePulse(false), 900);
    toast.success("Séance enregistrée");
  };

  const removeSession = async (sessionId: string) => {
    const { error } = await supabase.from("coaching_sessions").delete().eq("id", sessionId);
    if (error) {
      toast.error("Suppression impossible", error.message);
      return;
    }
    setSessions((prev) => prev.filter((session) => session.id !== sessionId));
  };

  const duplicateSession = async (session: TrainingSession, targetDate: Date) => {
    if (!activeClubId || !user) return;
    const clonePayload = {
      club_id: activeClubId,
      coach_id: user.id,
      title: `${session.title} (copie)`,
      objective: session.title,
      activity_type: session.sport,
      scheduled_at: targetDate.toISOString(),
      target_group_id: session.groupId || null,
      target_athletes: session.athleteId ? [session.athleteId] : null,
      send_mode: session.groupId ? "group" : "club",
      status: "draft",
      session_blocks: session.blocks,
      distance_km:
        session.blocks.reduce((acc, block) => acc + (block.distanceM || 0) * (block.repetitions || 1), 0) / 1000 || null,
    };
    const { data, error } = await supabase.from("coaching_sessions").insert(clonePayload).select("id").single();
    if (error) {
      toast.error("Duplication impossible", error.message);
      return;
    }
    setSessions((prev) => [
      ...prev,
      {
        ...session,
        id: data.id,
        dbId: data.id,
        sent: false,
        assignedDate: targetDate.toISOString(),
        blocks: session.blocks.map((b) => ({ ...b, id: uid() })),
      },
    ]);
  };

  const sendSession = async (sessionId: string) => {
    const session = sessions.find((entry) => entry.id === sessionId);
    if (!session || !activeClubId) return;
    const targetIds = new Set<string>();
    if (session.athleteId) {
      targetIds.add(session.athleteId);
    } else if (session.groupId && groupMembers[session.groupId]?.length) {
      groupMembers[session.groupId].forEach((id) => targetIds.add(id));
    } else {
      athletes.forEach((athlete) => targetIds.add(athlete.id));
    }
    const athleteIds = Array.from(targetIds);
    const { error: sendError } = await supabase.from("coaching_sessions").update({ status: "sent" }).eq("id", sessionId);
    if (sendError) {
      toast.error("Envoi impossible", sendError.message);
      return;
    }
    if (athleteIds.length) {
      const { data: existing } = await supabase
        .from("coaching_participations")
        .select("user_id")
        .eq("coaching_session_id", sessionId)
        .in("user_id", athleteIds);
      const existingIds = new Set((existing || []).map((item) => item.user_id));
      const toCreate = athleteIds
        .filter((id) => !existingIds.has(id))
        .map((id) => ({ coaching_session_id: sessionId, user_id: id, status: "sent" }));
      if (toCreate.length) {
        const { error: partError } = await supabase.from("coaching_participations").insert(toCreate);
        if (partError) {
          toast.error("Envoi partiel", partError.message);
          return;
        }
      }
    }
    setSessions((prev) => prev.map((entry) => (entry.id === sessionId ? { ...entry, sent: true } : entry)));
    toast.success("Séance envoyée");
  };

  const openWheel = (
    title: string,
    items: Array<{ value: string; label: string }>,
    currentValue: string,
    onConfirm: (next: string) => void
  ) => {
    setWheelTitle(title);
    setWheelItems(items);
    setWheelValue(currentValue);
    setApplyWheel(() => onConfirm);
    setWheelOpen(true);
  };

  const startBlockCreation = (type?: BlockType, existing?: SessionBlock) => {
    const base: SessionBlock = existing ?? {
      id: uid(),
      order: draft.blocks.length + 1,
      type: type ?? "steady",
      durationSec: 20 * 60,
      intensityMode: "zones",
      zone: "Z2",
    };
    setBlockForm(base);
    setEditingBlockId(existing?.id ?? null);
    setBlockStep(type ? "config" : "type");
    setBlockSheetOpen(true);
  };

  const confirmBlock = () => {
    if (!blockForm) return;
    setDraft((prev) => {
      if (!editingBlockId) {
        return { ...prev, blocks: [...prev.blocks, { ...blockForm, order: prev.blocks.length + 1 }] };
      }
      return {
        ...prev,
        blocks: prev.blocks.map((block) => (block.id === editingBlockId ? { ...blockForm, order: block.order } : block)),
      };
    });
    setBlockSheetOpen(false);
    setBlockForm(null);
    setEditingBlockId(null);
  };

  const moveBlock = (blockId: string, direction: -1 | 1) => {
    setDraft((prev) => {
      const index = prev.blocks.findIndex((b) => b.id === blockId);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= prev.blocks.length) return prev;
      const next = [...prev.blocks];
      const temp = next[index];
      next[index] = next[target];
      next[target] = temp;
      return { ...prev, blocks: next.map((block, idx) => ({ ...block, order: idx + 1 })) };
    });
  };

  const targetLabel = activeAthleteId
    ? athletes.find((a) => a.id === activeAthleteId)?.name
    : activeGroupId
    ? groups.find((g) => g.id === activeGroupId)?.name
    : "Tous les athlètes";

  const dayIndicatorsByDate = useMemo(() => {
    const map: Record<string, Array<{ color: string }>> = {};
    filteredSessions.forEach((session) => {
      const key = format(new Date(session.assignedDate), "yyyy-MM-dd");
      const type = session.blocks[0]?.type;
      const color =
        type === "interval" ? "#EF4444" :
        type === "warmup" ? "#F97316" :
        type === "recovery" ? "#3B82F6" :
        type === "cooldown" ? "#10B981" :
        "#EAB308";
      if (!map[key]) map[key] = [];
      map[key].push({ color });
    });
    return map;
  }, [filteredSessions]);

  const activeClubName = clubs.find((club) => club.id === activeClubId)?.name;
  const coachName =
    (user?.user_metadata?.display_name as string | undefined) ||
    (user?.user_metadata?.full_name as string | undefined) ||
    (user?.email ? user.email.split("@")[0] : "Coach");

  const handleDrawerSelect = (key: CoachMenuKey) => {
    setActiveMenuKey(key);
    setDrawerOpen(false);
    if (key === "planning") {
      setCoachingTab("planning");
      return;
    }
    if (key === "messages") {
      navigate("/messages");
      return;
    }
    if (key === "settings") {
      navigate("/profile/edit");
      return;
    }
    // Keep in-coaching sections in place (dashboard, athletes, groups, etc.)
    setCoachingTab("planning");
  };

  return (
    <>
      <div className="flex h-full min-h-0 flex-col overflow-hidden bg-secondary" data-tutorial="tutorial-coaching">
        <IosFixedPageHeaderShell
          className="min-h-0 flex-1"
          headerWrapperClassName="shrink-0 border-b border-border bg-card"
          header={<PlanningHeader onOpenMenu={() => setDrawerOpen(true)} />}
          scrollClassName="bg-secondary pb-24"
        >
          <div className="space-y-4 px-ios-4 pb-ios-6">
            <div className="pt-1">
              <h1 className="text-[32px] font-bold tracking-tight text-foreground">Planification</h1>
              <p className="text-[13px] text-muted-foreground">Semaine de {targetLabel}</p>
            </div>

            {activeMenuKey === "planning" && clubs.length > 1 && (
              <div className="ios-card rounded-2xl border border-border/70 bg-card p-2">
                <p className="px-2 pb-1 text-[11px] uppercase tracking-wider text-muted-foreground">Club</p>
                <div className="grid grid-cols-1 gap-1">
                  {clubs.map((club) => (
                    <button
                      key={club.id}
                      type="button"
                      onClick={() => setActiveClubId(club.id)}
                      className={cn(
                        "rounded-xl px-3 py-2 text-left text-[13px] font-medium",
                        activeClubId === club.id ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"
                      )}
                    >
                      {club.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {activeMenuKey === "planning" && <PlanningSearchBar value={search} onChange={setSearch} />}

            {activeMenuKey === "planning" && (searchResults.athletes.length > 0 || searchResults.groups.length > 0) && (
              <div className="ios-card rounded-2xl border border-border/70 bg-card p-2">
                {searchResults.groups.map((group) => (
                  <button
                    key={group.id}
                    className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left active:bg-secondary"
                    onClick={() => {
                      setActiveGroupId(group.id);
                      setActiveAthleteId(undefined);
                      setSearch("");
                    }}
                  >
                    <span className="text-[14px] font-medium text-foreground">{group.name}</span>
                    <span className="text-[12px] text-muted-foreground">Groupe</span>
                  </button>
                ))}
                {searchResults.athletes.map((athlete) => (
                  <button
                    key={athlete.id}
                    className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left active:bg-secondary"
                    onClick={() => {
                      setActiveAthleteId(athlete.id);
                      setActiveGroupId(undefined);
                      setSearch("");
                    }}
                  >
                    <span className="text-[14px] font-medium text-foreground">{athlete.name}</span>
                    <span className="text-[12px] text-muted-foreground">Athlète</span>
                  </button>
                ))}
              </div>
            )}

            {activeMenuKey === "planning" ? (
              <>
                <WeekSelectorPremium
                  weekStart={weekAnchor}
                  selectedDate={selectedDate}
                  onSelectDate={setSelectedDate}
                  onPreviousWeek={() => setWeekAnchor((current) => subWeeks(current, 1))}
                  onNextWeek={() => setWeekAnchor((current) => addWeeks(current, 1))}
                  indicatorsByDate={dayIndicatorsByDate}
                />

                <div className="space-y-2">
                  {weekDays.map((day) => {
                const daySessions = filteredSessions.filter((session) => isSameDay(new Date(session.assignedDate), day));
                const session = daySessions[0];
                const isSelectedDay = format(day, "yyyy-MM-dd") === format(selectedDate, "yyyy-MM-dd");
                const durationSec = session?.blocks.reduce((acc, block) => acc + (block.durationSec || 0) * (block.repetitions || 1), 0) || 0;
                const distanceM = session?.blocks.reduce((acc, block) => acc + (block.distanceM || 0) * (block.repetitions || 1), 0) || 0;
                const summary = session
                  ? {
                      title: session.title,
                      duration: durationSec > 0 ? secondsToLabel(durationSec) : undefined,
                      distance: distanceM > 0 ? metersToLabel(distanceM) : undefined,
                      intensityLabel:
                        session.blocks[0]?.intensityMode === "rpe"
                          ? session.blocks[0]?.rpe != null
                            ? `RPE ${session.blocks[0].rpe}`
                            : undefined
                          : session.blocks[0]?.zone,
                    }
                  : undefined;
                const accentColor =
                  !session ? "#9CA3AF" :
                  session.sport === "cycling" ? "#EAB308" :
                  session.blocks[0]?.type === "recovery" ? "#22C55E" :
                  session.blocks[0]?.type === "interval" ? "#F97316" :
                  session.blocks[0]?.type === "steady" ? "#8B5CF6" :
                  session.sport === "running" ? "#60A5FA" :
                  "#9CA3AF";
                return (
                  <DayPlanningRow
                    key={day.toISOString()}
                    dayLabel={format(day, "EEEE", { locale: fr })}
                    dateLabel={format(day, "d MMM", { locale: fr })}
                    isSelected={isSelectedDay}
                    session={summary}
                    isSent={session?.sent}
                    accentColor={accentColor}
                    onAdd={() => openCreateForDate(day)}
                    onOpen={session ? () => openEditSession(session.id) : undefined}
                    onEdit={session ? () => openEditSession(session.id) : undefined}
                    onSend={session ? () => void sendSession(session.id) : undefined}
                    onDuplicate={session ? () => void duplicateSession(session, addDays(day, 1)) : undefined}
                    onDelete={session ? () => void removeSession(session.id) : undefined}
                  />
                );
                  })}
                </div>
              </>
            ) : (
              <div className="ios-card rounded-2xl border border-border/70 bg-card p-4">
                <p className="text-[16px] font-semibold text-foreground">
                  {activeMenuKey === "dashboard" && "Tableau de bord coach"}
                  {activeMenuKey === "athletes" && "Athlètes"}
                  {activeMenuKey === "groups" && "Groupes"}
                  {activeMenuKey === "tracking" && "Suivi athlète"}
                  {activeMenuKey === "library" && "Bibliothèque de séances"}
                  {activeMenuKey === "templates" && "Modèles"}
                  {activeMenuKey === "club" && "Gérer le club"}
                </p>
                <p className="mt-1 text-[13px] text-muted-foreground">
                  Section prête dans le drawer coach. La navigation latérale est active et ce module peut être enrichi ensuite.
                </p>
              </div>
            )}
          </div>
        </IosFixedPageHeaderShell>
      </div>

      <AppDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        activeKey={activeMenuKey}
        onSelect={handleDrawerSelect}
        coachName={coachName}
        clubName={activeClubName}
        messageBadge={unreadMessages}
      />

      {coachingTab === "create" && (
        <div className="fixed inset-0 z-[120] flex min-h-0 flex-col overflow-hidden bg-secondary">
          <IosFixedPageHeaderShell
            className="min-h-0 h-full"
            headerWrapperClassName="shrink-0 border-b border-border bg-card"
            header={
              <div className="pt-[var(--safe-area-top)]">
                <IosPageHeaderBar
                  left={
                    <button
                      type="button"
                      className="text-[16px] font-medium text-primary"
                      onClick={() => setCoachingTab("planning")}
                    >
                      Retour
                    </button>
                  }
                  title="Créer une séance"
                  right={
                    <button
                      type="button"
                      onClick={() => void saveSession()}
                      disabled={draft.blocks.length === 0}
                      className={cn(
                        "text-[16px] font-semibold",
                        draft.blocks.length ? "text-primary" : "text-muted-foreground"
                      )}
                    >
                      Enregistrer
                    </button>
                  }
                />
                <div className="grid grid-cols-3 gap-1 px-4 pb-2">
                  {[
                    { id: "build", label: "Construire" },
                    { id: "library", label: "Bibliothèque" },
                    { id: "templates", label: "Modèles" },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setEditorTab(tab.id as typeof editorTab)}
                      className={cn(
                        "rounded-xl py-2 text-[13px] font-semibold",
                        editorTab === tab.id ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
                      )}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>
            }
            scrollClassName="bg-secondary pb-24"
            footer={
              editorTab === "build" && (
                <div className="border-t border-border bg-card px-4 py-3 pb-[max(0.9rem,var(--safe-area-bottom))]">
                  <div
                    className={cn(
                      "mb-2 flex items-center justify-between rounded-xl bg-secondary px-3 py-2 text-[13px]",
                      savePulse && "animate-pulse"
                    )}
                  >
                    <span className="text-muted-foreground">Total estimé</span>
                    <span className="font-semibold text-foreground">
                      {secondsToLabel(totalDurationSec)} {totalDistanceM > 0 ? `• ${metersToLabel(totalDistanceM)}` : ""}
                    </span>
                  </div>
                  <Button
                    onClick={() => void saveSession()}
                    className="h-11 w-full rounded-xl text-[15px] font-semibold"
                    disabled={draft.blocks.length === 0}
                  >
                    Enregistrer la séance
                  </Button>
                </div>
              )
            }
          >
            {editorTab === "build" ? (
              <div className="space-y-4 px-4 pb-6">
                <div className="grid grid-cols-2 gap-2">
                  {SPORTS.map((sport) => (
                    <button
                      key={sport.id}
                      type="button"
                      onClick={() => setDraft((prev) => ({ ...prev, sport: sport.id }))}
                      className={cn(
                        "flex items-center gap-2 rounded-2xl border px-3 py-3 text-left transition-all",
                        draft.sport === sport.id
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-card text-foreground"
                      )}
                    >
                      <sport.icon className="h-4 w-4" />
                      <span className="text-[13px] font-semibold">{sport.label}</span>
                    </button>
                  ))}
                </div>

                <Input
                  value={draft.title}
                  onChange={(e) => setDraft((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="Nom de la séance"
                  className="h-11 rounded-2xl border-border bg-card text-[15px]"
                />

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[15px] font-semibold text-foreground">Structure de la séance</h3>
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-1 text-[12px] font-medium text-primary"
                      onClick={() => startBlockCreation()}
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Ajouter un bloc
                    </button>
                  </div>

                  {draft.blocks.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-border bg-card px-3 py-5 text-center">
                      <p className="text-[14px] font-medium text-foreground">Aucun bloc pour le moment</p>
                      <p className="mt-1 text-[12px] text-muted-foreground">
                        Ajoute un premier bloc pour construire la séance.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {draft.blocks.map((block, index) => (
                        <div key={block.id} className="rounded-2xl border border-border/70 bg-card p-3">
                          <button
                            type="button"
                            className="w-full text-left"
                            onClick={() => startBlockCreation(undefined, block)}
                          >
                            <p className="text-[13px] font-semibold text-foreground">
                              {index + 1}. {blockTitle(block.type)}
                            </p>
                            <p className="mt-0.5 text-[12px] text-muted-foreground">{blockSummary(block)}</p>
                          </button>
                          <div className="mt-2 flex items-center gap-1">
                            <Button variant="secondary" size="sm" className="h-8 rounded-lg text-[12px]" onClick={() => moveBlock(block.id, -1)}>
                              Monter
                            </Button>
                            <Button variant="secondary" size="sm" className="h-8 rounded-lg text-[12px]" onClick={() => moveBlock(block.id, 1)}>
                              Descendre
                            </Button>
                            <Button
                              variant="secondary"
                              size="sm"
                              className="h-8 rounded-lg text-[12px]"
                              onClick={() => {
                                const copied = { ...block, id: uid(), order: draft.blocks.length + 1 };
                                setDraft((prev) => ({ ...prev, blocks: [...prev.blocks, copied] }));
                              }}
                            >
                              Dupliquer
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="ml-auto h-8 rounded-lg text-[12px] text-destructive"
                              onClick={() => setDraft((prev) => ({ ...prev, blocks: prev.blocks.filter((item) => item.id !== block.id) }))}
                            >
                              Supprimer
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="px-4 py-10 text-center">
                <div className="mx-auto mb-3 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <SwatchBook className="h-6 w-6" />
                </div>
                <p className="text-[16px] font-semibold text-foreground">
                  {editorTab === "library" ? "Bibliothèque bientôt disponible" : "Modèles bientôt disponibles"}
                </p>
                <p className="mt-1 text-[13px] text-muted-foreground">
                  L'architecture est prête pour brancher les séances réutilisables et templates.
                </p>
              </div>
            )}
          </IosFixedPageHeaderShell>
        </div>
      )}

      <Sheet open={blockSheetOpen} onOpenChange={setBlockSheetOpen}>
        <SheetContent
          side="bottom"
          showCloseButton={false}
          className="h-[78dvh] rounded-t-[20px] border-border bg-card p-0"
        >
          <div className="border-b border-border px-4 py-3">
            <div className="mx-auto mb-2 h-1.5 w-12 rounded-full bg-muted" />
            <p className="text-center text-[17px] font-semibold text-foreground">
              {blockStep === "type" ? "Choisir un type de bloc" : "Configurer le bloc"}
            </p>
          </div>

          {blockStep === "type" ? (
            <div className="space-y-2 px-4 py-4">
              {BLOCK_TYPES.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  className={cn(
                    "w-full rounded-2xl border px-3 py-3 text-left transition-transform active:scale-[0.99]",
                    entry.tone
                  )}
                  onClick={() => {
                    if (!blockForm) return;
                    setBlockForm({ ...blockForm, type: entry.id });
                    setBlockStep("config");
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn("inline-flex h-10 w-10 items-center justify-center rounded-xl", entry.iconTone)}>
                      <entry.icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[15px] font-semibold text-foreground">
                        {entry.emoji} {entry.label}
                      </p>
                      <p className="text-[12px] text-muted-foreground">{entry.detail}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : blockForm ? (
            <div className="space-y-3 px-4 py-4">
              {(() => {
                const meta = blockTypeMeta(blockForm.type);
                return (
                  <div className={cn("rounded-2xl border p-3", meta.tone)}>
                    <div className="flex items-center gap-3">
                      <div className={cn("inline-flex h-10 w-10 items-center justify-center rounded-xl", meta.iconTone)}>
                        <meta.icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[15px] font-semibold text-foreground">
                          {meta.emoji} {meta.label}
                        </p>
                        <p className="text-[12px] text-muted-foreground">{meta.detail}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setBlockStep("type")}
                        className="rounded-lg bg-card/80 px-2.5 py-1 text-[12px] font-medium text-primary"
                      >
                        Changer
                      </button>
                    </div>
                  </div>
                );
              })()}

              <div className="rounded-2xl border border-border bg-secondary/40 p-2.5">
                <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Volume
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="secondary"
                    className="h-10 justify-start rounded-xl text-[13px]"
                    onClick={() =>
                      openWheel(
                        "Durée",
                        Array.from({ length: 121 }, (_, i) => ({ value: String(i * 60), label: i === 0 ? "0 min" : `${i} min` })),
                        String(blockForm.durationSec || 0),
                        (next) => setBlockForm((prev) => (prev ? { ...prev, durationSec: Number(next), distanceM: undefined } : prev))
                      )
                    }
                  >
                    Durée: {secondsToLabel(blockForm.durationSec) || "Non définie"}
                  </Button>
                  <Button
                    variant="secondary"
                    className="h-10 justify-start rounded-xl text-[13px]"
                    onClick={() =>
                      openWheel(
                        "Distance",
                        Array.from({ length: 101 }, (_, i) => ({ value: String(i * 100), label: i === 0 ? "0 m" : `${i * 100} m` })),
                        String(blockForm.distanceM || 0),
                        (next) => setBlockForm((prev) => (prev ? { ...prev, distanceM: Number(next), durationSec: undefined } : prev))
                      )
                    }
                  >
                    Distance: {metersToLabel(blockForm.distanceM) || "Non définie"}
                  </Button>
                </div>
              </div>

              {blockForm.type === "interval" && (
                <div className="rounded-2xl border border-border bg-secondary/40 p-2.5">
                  <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Répétitions & récupération
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="secondary"
                      className="h-10 justify-start rounded-xl text-[13px]"
                      onClick={() =>
                        openWheel(
                          "Répétitions",
                          Array.from({ length: 20 }, (_, i) => ({ value: String(i + 1), label: String(i + 1) })),
                          String(blockForm.repetitions || 1),
                          (next) => setBlockForm((prev) => (prev ? { ...prev, repetitions: Number(next) } : prev))
                        )
                      }
                    >
                      Répétitions: {blockForm.repetitions || 1}
                    </Button>
                    <Button
                      variant="secondary"
                      className="h-10 justify-start rounded-xl text-[13px]"
                      onClick={() =>
                        openWheel(
                          "Récupération (sec)",
                          Array.from({ length: 61 }, (_, i) => ({ value: String(i * 15), label: i === 0 ? "Aucune" : `${i * 15} s` })),
                          String(blockForm.recoveryDurationSec || 0),
                          (next) => setBlockForm((prev) => (prev ? { ...prev, recoveryDurationSec: Number(next) } : prev))
                        )
                      }
                    >
                      Récup: {secondsToLabel(blockForm.recoveryDurationSec) || "Aucune"}
                    </Button>
                  </div>
                </div>
              )}

              {draft.sport !== "strength" && (
                <div className="rounded-2xl border border-border bg-secondary/40 p-2.5">
                  <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Cible
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    <Button
                      variant="secondary"
                      className="h-10 justify-start rounded-xl text-[12px]"
                      onClick={() =>
                        openWheel(
                          "Allure",
                          Array.from({ length: 541 }, (_, idx) => {
                            const total = 180 + idx;
                            const min = Math.floor(total / 60);
                            const sec = total % 60;
                            return { value: String(total), label: `${min}:${sec.toString().padStart(2, "0")}/km` };
                          }),
                          String(blockForm.paceSecPerKm || 330),
                          (next) =>
                            setBlockForm((prev) =>
                              prev ? { ...prev, paceSecPerKm: Number(next), speedKmh: undefined, powerWatts: undefined } : prev
                            )
                        )
                      }
                    >
                      {paceToLabel(blockForm.paceSecPerKm) || "Allure"}
                    </Button>
                    <Button
                      variant="secondary"
                      className="h-10 justify-start rounded-xl text-[12px]"
                      onClick={() =>
                        openWheel(
                          "Vitesse",
                          Array.from({ length: 51 }, (_, i) => ({ value: String(i + 10), label: `${i + 10} km/h` })),
                          String(blockForm.speedKmh || 12),
                          (next) =>
                            setBlockForm((prev) =>
                              prev ? { ...prev, speedKmh: Number(next), paceSecPerKm: undefined, powerWatts: undefined } : prev
                            )
                        )
                      }
                    >
                      {blockForm.speedKmh ? `${blockForm.speedKmh} km/h` : "Vitesse"}
                    </Button>
                    <Button
                      variant="secondary"
                      className="h-10 justify-start rounded-xl text-[12px]"
                      onClick={() =>
                        openWheel(
                          "Puissance",
                          Array.from({ length: 351 }, (_, i) => ({ value: String(i + 50), label: `${i + 50} W` })),
                          String(blockForm.powerWatts || 180),
                          (next) =>
                            setBlockForm((prev) =>
                              prev ? { ...prev, powerWatts: Number(next), paceSecPerKm: undefined, speedKmh: undefined } : prev
                            )
                        )
                      }
                    >
                      {blockForm.powerWatts ? `${blockForm.powerWatts} W` : "Puissance"}
                    </Button>
                  </div>
                </div>
              )}

              <div className="rounded-2xl border border-border bg-secondary/40 p-2">
                <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Intensité
                </p>
                <div className="mb-2 grid grid-cols-2 gap-1 rounded-xl bg-secondary p-1">
                  <button
                    type="button"
                    className={cn(
                      "rounded-lg py-1.5 text-[12px] font-semibold",
                      (blockForm.intensityMode ?? "zones") === "zones"
                        ? "bg-card text-foreground"
                        : "text-muted-foreground"
                    )}
                    onClick={() => setBlockForm((prev) => (prev ? { ...prev, intensityMode: "zones" } : prev))}
                  >
                    Zones
                  </button>
                  <button
                    type="button"
                    className={cn(
                      "rounded-lg py-1.5 text-[12px] font-semibold",
                      blockForm.intensityMode === "rpe" ? "bg-card text-foreground" : "text-muted-foreground"
                    )}
                    onClick={() => setBlockForm((prev) => (prev ? { ...prev, intensityMode: "rpe" } : prev))}
                  >
                    RPE
                  </button>
                </div>

                {(blockForm.intensityMode ?? "zones") === "zones" ? (
                  <div className="grid grid-cols-2 gap-1">
                    {ZONE_META.map((zone) => (
                      <button
                        key={zone.zone}
                        type="button"
                        className={cn(
                          "rounded-xl px-2 py-2 text-left",
                          zone.tone,
                          blockForm.zone === zone.zone && "ring-2 ring-primary"
                        )}
                        onClick={() => setBlockForm((prev) => (prev ? { ...prev, zone: zone.zone } : prev))}
                      >
                        <p className="text-[12px] font-semibold">{zone.label}</p>
                        <p className="text-[11px]">{zone.description}</p>
                      </button>
                    ))}
                  </div>
                ) : (
                  <Button
                    variant="secondary"
                    className="h-10 w-full justify-start rounded-xl text-[13px]"
                    onClick={() =>
                      openWheel(
                        "RPE",
                        Array.from({ length: 11 }, (_, i) => ({ value: String(i), label: String(i) })),
                        String(blockForm.rpe ?? 5),
                        (next) => setBlockForm((prev) => (prev ? { ...prev, rpe: Number(next) } : prev))
                      )
                    }
                  >
                    RPE: {blockForm.rpe ?? 5}
                  </Button>
                )}
              </div>

              <Button onClick={confirmBlock} className="h-11 w-full rounded-xl text-[15px] font-semibold">
                Valider le bloc
              </Button>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>

      <WheelValuePickerModal
        open={wheelOpen}
        onClose={() => setWheelOpen(false)}
        title={wheelTitle}
        columns={[{ items: wheelItems, value: wheelValue, onChange: setWheelValue }]}
        onConfirm={() => {
          applyWheel?.(wheelValue);
          setWheelOpen(false);
        }}
      />
    </>
  );
}

