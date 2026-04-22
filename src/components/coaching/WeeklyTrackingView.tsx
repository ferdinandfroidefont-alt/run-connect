import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSendNotification } from "@/hooks/useSendNotification";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  ChevronLeft,
  ChevronRight,
  Search,
  ChevronRight as ChevronRightIcon,
  Bell,
  Loader2,
  CalendarDays,
  Bike,
  Dumbbell,
  Footprints,
  Moon,
  Waves,
  Save,
  Plus,
  Trash2,
} from "lucide-react";
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, eachDayOfInterval } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import { coachingRowToWeekSession } from "@/lib/coachingWeekSessionImport";
import type { WeekSession } from "@/components/coaching/WeeklyPlanSessionEditor";
import { parseAthleteBlockRpeFelt } from "@/lib/sessionBlockRpe";
import { useNavigate } from "react-router-dom";
import { getOrCreateDirectConversation } from "@/lib/coachingMessaging";
import { AthleteHeader } from "@/components/coaching/tracking/AthleteHeader";
import { AthleteSessionCard } from "@/components/coaching/tracking/AthleteSessionCard";
import { useProfileNavigation } from "@/hooks/useProfileNavigation";
import { ProfilePreviewDialog } from "@/components/ProfilePreviewDialog";
import { buildAthleteIntensityContext, computeAthletePaces, zoneToFeedback } from "@/lib/athleteWorkoutContext";
import {
  mergeRunningRecords,
  normalizeRunningEventKey,
  runningRecordsFromPrivateRows,
  type CoachPrivateRecordRow,
} from "@/lib/coachPrivateRunningRecords";

interface WeeklyTrackingViewProps {
  clubId: string;
  onClose: () => void;
  selectedAthleteId: string | null;
  onSelectAthlete: (id: string | null) => void;
  onOpenPlanForAthlete?: (
    athleteId: string,
    athleteName: string,
    groupId?: string,
    weekDate?: Date,
    seedSessions?: WeekSession[],
  ) => void;
}

interface SessionInfo {
  id: string;
  title: string;
  scheduled_at: string;
  distance_km: number | null;
  rcc_code: string | null;
  activity_type: string;
  objective: string | null;
  pace_target: string | null;
  rpe: number | null;
}

type CalendarSport = "running" | "cycling" | "swimming" | "strength" | "rest";

interface DayData {
  status: string;
  note: string | null;
  sessionTitle: string;
  sessionId: string;
  session: SessionInfo;
  athleteRpeFelt: unknown;
}

interface AthleteData {
  userId: string;
  displayName: string;
  username: string | null;
  avatarUrl: string | null;
  age: number | null;
   runningRecords: Record<string, unknown> | null;
   coachPrivateRunningRecords: Record<string, unknown> | null;
   coachPrivateRows: CoachPrivateRecordRow[];
  groupId: string | null;
  groupName: string | null;
  groupColor: string | null;
  days: Record<string, DayData>;
  completedCount: number;
  totalCount: number;
  weeklyVolumeKm: number;
}

interface GroupData {
  id: string;
  name: string;
  color: string;
  avatarUrl: string | null;
  memberCount: number;
  memberIds: string[];
}

const GROUP_COLORS = [
  "#3B82F6",
  "#EF4444",
  "#10B981",
  "#F59E0B",
  "#8B5CF6",
  "#EC4899",
  "#06B6D4",
  "#F97316",
];

const normalizeSearchValue = (value: string) =>
  value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "").replace(/^@/, "").trim();

const getObjectiveColor = (objective: string | null): string => {
  if (!objective) return "bg-muted text-muted-foreground";
  const o = objective.toLowerCase();
  if (o.includes("vma") || o.includes("interval")) return "bg-red-500/15 text-red-600";
  if (o.includes("seuil") || o.includes("tempo")) return "bg-orange-500/15 text-orange-600";
  if (o.includes("recup") || o.includes("récup")) return "bg-emerald-500/15 text-emerald-600";
  if (o.includes("endurance") || o.includes("footing") || o.includes("ef") || o.includes("sortie longue")) return "bg-green-500/15 text-green-600";
  if (o.includes("spe") || o.includes("spé")) return "bg-violet-500/15 text-violet-600";
  return "bg-primary/10 text-primary";
};

type UiDayStatus = "done" | "missed" | "pending" | "none";

const toUiStatus = (status?: string): UiDayStatus => {
  if (status === "completed") return "done";
  if (status === "missed") return "missed";
  if (status === "pending") return "pending";
  return "none";
};

function sessionTone(sport: CalendarSport) {
  switch (sport) {
    case "running":
      return "text-sky-500";
    case "cycling":
      return "text-emerald-500";
    case "swimming":
      return "text-cyan-500";
    case "strength":
      return "text-violet-500";
    default:
      return "text-muted-foreground";
  }
}

function SessionIcon({ sport, className }: { sport: CalendarSport; className?: string }) {
  switch (sport) {
    case "running":
      return <Footprints className={className} />;
    case "cycling":
      return <Bike className={className} />;
    case "swimming":
      return <Waves className={className} />;
    case "strength":
      return <Dumbbell className={className} />;
    default:
      return <Moon className={className} />;
  }
}

function isRestSession(session: SessionInfo): boolean {
  const title = (session.title || "").toLowerCase();
  const objective = (session.objective || "").toLowerCase();
  return title.includes("repos") || objective.includes("repos");
}

function sessionSummaryValue(session: SessionInfo): string | null {
  if (isRestSession(session)) return "Repos";
  const distanceKm = Number(session.distance_km || 0);
  if (distanceKm > 0) return `${Math.round(distanceKm * 10) / 10} km`;
  if (!session.rcc_code) return null;
  const code = session.rcc_code.toLowerCase();
  const hourMatch = code.match(/(\d+)\s*h(?:\s*(\d{1,2}))?/);
  if (hourMatch) {
    const h = Number(hourMatch[1]);
    const m = Number(hourMatch[2] || 0);
    return `${h}h${m.toString().padStart(2, "0")}`;
  }
  const minMatches = [...code.matchAll(/(\d+)\s*['m]/g)];
  const totalMin = minMatches.reduce((acc, match) => acc + Number(match[1] || 0), 0);
  if (totalMin >= 60) {
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    return `${h}h${m.toString().padStart(2, "0")}`;
  }
  if (totalMin > 0) return `${totalMin} min`;
  return null;
}

export const WeeklyTrackingView = ({ clubId, selectedAthleteId, onSelectAthlete, onOpenPlanForAthlete }: WeeklyTrackingViewProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { selectedUserId, navigateToProfile, closeProfilePreview } = useProfileNavigation();
  const { sendPushNotification } = useSendNotification();
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [athletes, setAthletes] = useState<AthleteData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [groups, setGroups] = useState<GroupData[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [newGroupName, setNewGroupName] = useState("");
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [sendingReminder, setSendingReminder] = useState(false);
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null);
  const [recordsDialogOpen, setRecordsDialogOpen] = useState(false);
  const [recordsDraft, setRecordsDraft] = useState<Array<{ id?: string; event_label: string; record_value: string; note: string }>>([]);
  const [savingRecords, setSavingRecords] = useState(false);

  const openConversationWithAthlete = useCallback(
    async (athleteId: string) => {
      if (!user) return;
      try {
        const conversationId = await getOrCreateDirectConversation(user.id, athleteId);
        navigate(`/messages?conversation=${conversationId}`);
      } catch (error) {
        console.error("Error opening athlete conversation:", error);
        toast.error("Impossible d'ouvrir la messagerie");
      }
    },
    [navigate, user]
  );

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const handleRescheduleSession = useCallback(
    async (sessionId: string) => {
      if (!onOpenPlanForAthlete || !selectedAthleteId) return;
      const athlete = athletes.find((a) => a.userId === selectedAthleteId);
      if (!athlete) return;
      const { data, error } = await supabase.from("coaching_sessions").select("*").eq("id", sessionId).single();
      if (error || !data) {
        toast.error("Impossible de charger la séance");
        return;
      }
      const ws = coachingRowToWeekSession(data);
      onOpenPlanForAthlete(athlete.userId, athlete.displayName, athlete.groupId || undefined, currentWeek, [ws]);
    },
    [onOpenPlanForAthlete, selectedAthleteId, athletes, currentWeek],
  );

  const [initialNavDone, setInitialNavDone] = useState(false);
  useEffect(() => {
    if (initialNavDone) return;
    const findLatestWeek = async () => {
      const { data: latestSession } = await supabase
        .from("coaching_sessions")
        .select("scheduled_at")
        .eq("club_id", clubId)
        .order("scheduled_at", { ascending: false })
        .limit(1)
        .single();
      if (latestSession) {
        const latestDate = new Date(latestSession.scheduled_at);
        const latestWeekStart = startOfWeek(latestDate, { weekStartsOn: 1 });
        if (latestWeekStart.getTime() !== weekStart.getTime()) {
          setCurrentWeek(latestDate);
        }
      }
      setInitialNavDone(true);
    };
    findLatestWeek();
  }, [clubId]);

  const loadTracking = useCallback(async () => {
    setLoading(true);
    try {
      const { data: clubMembers } = await supabase
        .from("group_members")
        .select("user_id")
        .eq("conversation_id", clubId);

      const allUserIds = (clubMembers || []).map(m => m.user_id);
      if (allUserIds.length === 0) { setAthletes([]); setLoading(false); return; }

      // Load profiles, groups, and sessions in parallel
      const [profilesRes, groupsRes, groupMembersRes, sessionsRes, coachPrivateRecordsRes] = await Promise.all([
        supabase.from("profiles").select("user_id, display_name, username, avatar_url, age, running_records").in("user_id", allUserIds),
        supabase.from("club_groups").select("id, name, color, avatar_url").eq("club_id", clubId).order("created_at"),
        supabase.from("club_group_members").select("user_id, group_id").in("user_id", allUserIds),
        supabase
          .from("coaching_sessions")
          .select("id, title, scheduled_at, distance_km, rcc_code, activity_type, objective, pace_target, rpe")
          .eq("club_id", clubId)
          .gte("scheduled_at", weekStart.toISOString())
          .lte("scheduled_at", weekEnd.toISOString()),
        user
          ? supabase
              .from("coach_athlete_private_records")
              .select("id, athlete_user_id, sport_key, event_label, record_value, note")
              .eq("club_id", clubId)
              .eq("coach_id", user.id)
              .in("athlete_user_id", allUserIds)
          : Promise.resolve({ data: [], error: null }),
      ]);

      // Build group lookup: userId -> { name, color }
      const groupMap: Record<string, { name: string; color: string }> = {};
      (groupsRes.data || []).forEach(g => { groupMap[g.id] = { name: g.name, color: g.color }; });
      const userGroupMap: Record<string, { id: string; name: string; color: string }> = {};
      (groupMembersRes.data || []).forEach(gm => {
        if (groupMap[gm.group_id]) userGroupMap[gm.user_id] = { id: gm.group_id, ...groupMap[gm.group_id] };
      });

      const privateRowsByAthlete = ((coachPrivateRecordsRes.data || []) as CoachPrivateRecordRow[]).reduce<Record<string, CoachPrivateRecordRow[]>>((acc, row) => {
        if (!acc[row.athlete_user_id]) acc[row.athlete_user_id] = [];
        acc[row.athlete_user_id].push(row);
        return acc;
      }, {});

      const athleteMap: Record<string, AthleteData> = {};
      (profilesRes.data || []).forEach(p => {
        if (!p.user_id) return;
        const grp = userGroupMap[p.user_id];
        const coachPrivateRows = privateRowsByAthlete[p.user_id] || [];
        athleteMap[p.user_id] = {
          userId: p.user_id, displayName: p.display_name || "Athlète",
          username: p.username || null, avatarUrl: p.avatar_url || null,
          age: p.age || null,
          runningRecords: p.running_records && typeof p.running_records === "object" ? (p.running_records as Record<string, unknown>) : null,
          coachPrivateRows,
          coachPrivateRunningRecords: runningRecordsFromPrivateRows(coachPrivateRows),
          groupId: grp?.id || null, groupName: grp?.name || null, groupColor: grp?.color || null,
          days: {}, completedCount: 0, totalCount: 0, weeklyVolumeKm: 0,
        };
      });

      const groupMemberMap: Record<string, string[]> = {};
      (groupMembersRes.data || []).forEach((membership) => {
        if (!groupMemberMap[membership.group_id]) groupMemberMap[membership.group_id] = [];
        groupMemberMap[membership.group_id].push(membership.user_id);
      });
      const loadedGroups: GroupData[] = (groupsRes.data || []).map((group) => ({
        id: group.id,
        name: group.name,
        color: group.color,
        avatarUrl: group.avatar_url || null,
        memberCount: (groupMemberMap[group.id] || []).length,
        memberIds: groupMemberMap[group.id] || [],
      }));
      setGroups(loadedGroups);

      const sessions = sessionsRes.data;
      if (sessions && sessions.length > 0) {
        const sessionIds = sessions.map(s => s.id);
        const sessionMap: Record<string, SessionInfo> = {};
        sessions.forEach(s => { sessionMap[s.id] = s; });

        const { data: participations } = await supabase
          .from("coaching_participations")
          .select("coaching_session_id, user_id, status, athlete_note, completed_at")
          .in("coaching_session_id", sessionIds);

        (participations || []).forEach(p => {
          if (!athleteMap[p.user_id]) return;
          const session = sessionMap[p.coaching_session_id];
          if (!session) return;
          const dayKey = format(new Date(session.scheduled_at), "yyyy-MM-dd");
          athleteMap[p.user_id].days[dayKey] = {
            status: p.status,
            note: p.athlete_note,
            sessionTitle: session.title,
            sessionId: session.id,
            session,
            athleteRpeFelt: null,
          };
          athleteMap[p.user_id].totalCount++;
          athleteMap[p.user_id].weeklyVolumeKm += Number(session.distance_km) || 0;
          if (p.status === "completed") athleteMap[p.user_id].completedCount++;
        });
      }

      setAthletes(Object.values(athleteMap).sort((a, b) => {
        if (a.totalCount > 0 && b.totalCount === 0) return -1;
        if (a.totalCount === 0 && b.totalCount > 0) return 1;
        return a.displayName.localeCompare(b.displayName);
      }));
    } catch (e) {
      console.error("Error loading tracking:", e);
    } finally {
      setLoading(false);
    }
  }, [clubId, currentWeek]);

  const openRecordsEditor = useCallback(() => {
    if (!selectedAthlete) return;
    const runningRows = selectedAthlete.coachPrivateRows.filter((row) => row.sport_key === "running");
    setRecordsDraft(
      runningRows.length
        ? runningRows.map((row) => ({ id: row.id, event_label: row.event_label, record_value: row.record_value, note: row.note ?? "" }))
        : [
            { event_label: "5 km", record_value: "", note: "" },
            { event_label: "3 km", record_value: "", note: "" },
            { event_label: "10 km", record_value: "", note: "" },
          ]
    );
    setRecordsDialogOpen(true);
  }, [selectedAthlete]);

  const saveCoachPrivateRecords = useCallback(async () => {
    if (!user || !selectedAthlete) return;
    setSavingRecords(true);
    try {
      const cleaned = recordsDraft
        .map((row) => ({ ...row, event_label: row.event_label.trim(), record_value: row.record_value.trim(), note: row.note.trim() }))
        .filter((row) => row.event_label && row.record_value);

      const existingIds = new Set((selectedAthlete.coachPrivateRows || []).filter((row) => row.sport_key === "running").map((row) => row.id));
      const keptIds = new Set(cleaned.map((row) => row.id).filter(Boolean) as string[]);
      const idsToDelete = [...existingIds].filter((id) => !keptIds.has(id));

      if (idsToDelete.length) {
        const { error } = await supabase.from("coach_athlete_private_records").delete().in("id", idsToDelete);
        if (error) throw error;
      }

      if (cleaned.length) {
        const payload = cleaned.map((row) => ({
          id: row.id,
          coach_id: user.id,
          athlete_user_id: selectedAthlete.userId,
          club_id: clubId,
          sport_key: "running",
          event_label: row.event_label,
          record_value: row.record_value,
          note: row.note || null,
        }));
        const { error } = await supabase.from("coach_athlete_private_records").upsert(payload, { onConflict: "coach_id,athlete_user_id,club_id,sport_key,event_label" });
        if (error) throw error;
      }

      toast.success("Records privés enregistrés");
      setRecordsDialogOpen(false);
      await loadTracking();
    } catch (error) {
      console.error(error);
      toast.error("Impossible d'enregistrer les records");
    } finally {
      setSavingRecords(false);
    }
  }, [clubId, loadTracking, recordsDraft, selectedAthlete, user]);

  useEffect(() => {
    void loadTracking();
  }, [loadTracking]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`weekly-tracking-${clubId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "coaching_participations" },
        () => {
          void loadTracking();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "coaching_sessions", filter: `club_id=eq.${clubId}` },
        () => {
          void loadTracking();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages" },
        () => {
          void loadTracking();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [clubId, user, loadTracking]);

  // Send reminder to athletes who haven't completed past sessions
  const handleSendReminder = async () => {
    const now = new Date();
    const lateAthletes = athletes.filter(a => {
      return Object.entries(a.days).some(([dayKey, d]) => {
        return new Date(dayKey) < now && d.status !== "completed";
      });
    });
    if (lateAthletes.length === 0) {
      toast.info("Tous les athlètes sont à jour !");
      return;
    }
    setSendingReminder(true);
    try {
      await Promise.all(
        lateAthletes.map(a =>
          sendPushNotification(a.userId, "⏰ Rappel de votre coach", "N'oubliez pas de valider vos séances !", "coaching_reminder")
        )
      );
      toast.success(`Rappel envoyé à ${lateAthletes.length} athlète${lateAthletes.length > 1 ? "s" : ""}`);
    } catch (e) {
      toast.error("Erreur lors de l'envoi");
    } finally {
      setSendingReminder(false);
    }
  };

  const filtered = useMemo(() => {
    const q = normalizeSearchValue(search);
    const byGroup = selectedGroupId ? athletes.filter((a) => a.groupId === selectedGroupId) : athletes;
    if (!q) return byGroup;
    return byGroup.filter(a => {
      const searchable = normalizeSearchValue(a.displayName) + normalizeSearchValue(a.username || "") + normalizeSearchValue(a.groupName || "");
      return searchable.includes(q);
    });
  }, [athletes, search, selectedGroupId]);

  const filteredGroups = useMemo(() => {
    const q = normalizeSearchValue(search);
    if (!q) return groups;
    return groups.filter((group) => normalizeSearchValue(group.name).includes(q));
  }, [groups, search]);

  const selectedGroup = useMemo(() => {
    if (!selectedGroupId) return null;
    return groups.find((group) => group.id === selectedGroupId) || null;
  }, [groups, selectedGroupId]);

  const selectedGroupAthletes = useMemo(() => {
    if (!selectedGroup) return [];
    return athletes.filter((athlete) => athlete.groupId === selectedGroup.id);
  }, [athletes, selectedGroup]);

  const createGroup = useCallback(async () => {
    const name = newGroupName.trim();
    if (!name || creatingGroup) return;
    setCreatingGroup(true);
    try {
      const color = GROUP_COLORS[groups.length % GROUP_COLORS.length];
      const { error } = await supabase.from("club_groups").insert({
        club_id: clubId,
        name,
        color,
      });
      if (error) {
        toast.error("Impossible de créer le groupe");
        return;
      }
      setNewGroupName("");
      await loadTracking();
      toast.success("Groupe créé");
    } catch (error) {
      toast.error("Impossible de créer le groupe");
    } finally {
      setCreatingGroup(false);
    }
  }, [clubId, creatingGroup, groups.length, loadTracking, newGroupName]);

  const selectedAthlete = useMemo(() => {
    if (!selectedAthleteId) return null;
    return athletes.find(a => a.userId === selectedAthleteId) || null;
  }, [athletes, selectedAthleteId]);

  const selectedMergedRunningRecords = useMemo(
    () => mergeRunningRecords(selectedAthlete?.runningRecords ?? null, selectedAthlete?.coachPrivateRunningRecords ?? null),
    [selectedAthlete]
  );

  const selectedAthleteIntensity = useMemo(
    () =>
      buildAthleteIntensityContext({
        runningRecords: selectedAthlete?.runningRecords ?? null,
        coachRunningRecords: selectedAthlete?.coachPrivateRunningRecords ?? null,
      }),
    [selectedAthlete]
  );

  const selectedAthletePaces = useMemo(
    () => computeAthletePaces({ runningRecords: selectedMergedRunningRecords }),
    [selectedMergedRunningRecords]
  );

  const selectedFeedback = useMemo(() => {
    const threshold = selectedAthletePaces?.thresholdPaceSecPerKm;
    const selectedPace = selectedDayData?.session.pace_target;
    if (!threshold || !selectedPace) return undefined;
    const [min, sec] = selectedPace.split(":").map(Number);
    if (!Number.isFinite(min) || !Number.isFinite(sec)) return undefined;
    const pace = min * 60 + sec;
    if (pace >= threshold * 1.12) return zoneToFeedback("Z2");
    if (pace >= threshold * 1.02) return zoneToFeedback("Z4");
    return zoneToFeedback("Z5");
  }, [selectedAthletePaces, selectedDayData]);

  const coachRecordSummary = useMemo(() => {
    if (!selectedAthlete?.coachPrivateRows?.length) return [];
    return selectedAthlete.coachPrivateRows
      .filter((row) => row.sport_key === "running")
      .slice(0, 3)
      .map((row) => `${normalizeRunningEventKey(row.event_label).toUpperCase()} ${row.record_value}`);
  }, [selectedAthlete]);

  useEffect(() => {
    if (!selectedAthlete) {
      setSelectedDayKey(null);
      return;
    }
    const todayKey = format(new Date(), "yyyy-MM-dd");
    if (selectedAthlete.days[todayKey]) {
      setSelectedDayKey(todayKey);
      return;
    }
    const firstWithSession = weekDays.find((day) => !!selectedAthlete.days[format(day, "yyyy-MM-dd")]);
    setSelectedDayKey(firstWithSession ? format(firstWithSession, "yyyy-MM-dd") : format(weekStart, "yyyy-MM-dd"));
  }, [selectedAthlete, weekDays, weekStart]);


  const weekLabel = `${format(weekStart, "d MMM", { locale: fr })} – ${format(weekEnd, "d MMM", { locale: fr })}`;
  const totalAthletes = athletes.length;
  const displayedAthletes = filtered.length;

  // ==================== MODE LISTE ====================
  if (!selectedAthlete) {
    return (
      <div className="space-y-0">
        <div className="border-b border-border bg-card px-4 py-3">
          <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-1 pt-0.5">
            {filteredGroups.map((group) => {
              const isSelected = selectedGroupId === group.id;
              return (
                <button
                  key={group.id}
                  type="button"
                  onClick={() => setSelectedGroupId((current) => (current === group.id ? null : group.id))}
                  className="flex min-w-[86px] flex-col items-center gap-1.5 py-1"
                >
                  <div
                    className={`flex h-[68px] w-[68px] items-center justify-center overflow-hidden rounded-full border transition-colors ${
                      isSelected ? "border-primary ring-2 ring-primary/20" : "border-border/60"
                    }`}
                    style={{ backgroundColor: group.avatarUrl ? undefined : `${group.color}1a` }}
                  >
                    {group.avatarUrl ? (
                      <img src={group.avatarUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-[22px] font-semibold" style={{ color: group.color }}>
                        {group.name.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <span className="max-w-[80px] truncate text-center text-[12px] font-medium text-foreground">
                    {group.name.replace(/^\[ARCHIVE\]\s*/, "")}
                  </span>
                </button>
              );
            })}
            {!loading && filteredGroups.length === 0 && (
              <div className="flex h-[92px] items-center text-[13px] text-muted-foreground">
                Aucun groupe
              </div>
            )}
          </div>
        </div>

        {selectedGroup && (
          <div className="border-b border-border bg-card px-4 py-3">
            <div className="rounded-2xl border border-border/60 bg-secondary/30 p-3">
              <div className="flex items-center gap-3">
                <div
                  className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full"
                  style={{ backgroundColor: selectedGroup.avatarUrl ? undefined : `${selectedGroup.color}26` }}
                >
                  {selectedGroup.avatarUrl ? (
                    <img src={selectedGroup.avatarUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-[16px] font-semibold" style={{ color: selectedGroup.color }}>
                      {selectedGroup.name.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-semibold text-foreground">{selectedGroup.name.replace(/^\[ARCHIVE\]\s*/, "")}</p>
                  <p className="text-[12px] text-muted-foreground">
                    {selectedGroup.memberCount} athlète{selectedGroup.memberCount > 1 ? "s" : ""}
                  </p>
                </div>
                <Badge className="rounded-lg border-0 bg-primary/10 px-2 py-0.5 text-[11px] text-primary">
                  Sélectionné
                </Badge>
              </div>

              {selectedGroupAthletes.length > 0 && (
                <div className="mt-3">
                  <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Membres</p>
                  <div className="flex -space-x-2">
                    {selectedGroupAthletes.slice(0, 6).map((athlete) => (
                      <div
                        key={athlete.userId}
                        className="h-8 w-8 overflow-hidden rounded-full border-2 border-card bg-secondary"
                        title={athlete.displayName}
                      >
                        {athlete.avatarUrl ? (
                          <img src={athlete.avatarUrl} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-[11px] font-semibold text-muted-foreground">
                            {athlete.displayName.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                    ))}
                    {selectedGroupAthletes.length > 6 && (
                      <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-card bg-muted text-[11px] font-medium text-muted-foreground">
                        +{selectedGroupAthletes.length - 6}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Reminder button */}
        <div className="border-b border-border bg-card px-4 py-2.5">
          <Button
            variant="outline"
            size="sm"
            className="h-10 w-full gap-2 rounded-lg text-[13px] font-semibold"
            onClick={handleSendReminder}
            disabled={sendingReminder}
          >
            {sendingReminder ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bell className="h-4 w-4" />}
            Relancer les athlètes en retard
          </Button>
        </div>
        {/* Search */}
        <div className="border-b border-border bg-card px-4 py-2.5">
          <p className="mb-2 text-[13px] font-medium text-muted-foreground">
            {search
              ? `${displayedAthletes} athlète${displayedAthletes > 1 ? "s" : ""} trouvé${displayedAthletes > 1 ? "s" : ""}`
              : `${totalAthletes} athlète${totalAthletes > 1 ? "s" : ""}`}
          </p>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un athlète ou un groupe..."
              className="h-10 rounded-full border-border/60 bg-background pl-9 text-[15px]"
            />
          </div>
        </div>

        {loading ? (
          <div className="divide-y divide-border border-b border-border bg-card">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-14 animate-pulse bg-secondary/40" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="border-b border-border bg-secondary/30 px-4 py-10 text-center">
            <p className="mb-1 text-[16px] font-semibold text-foreground">
              {search ? "Aucun athlète trouvé" : "Aucun athlète"}
            </p>
            <p className="text-[13px] text-muted-foreground">
              {search ? "Essayez un autre nom" : "Aucun membre dans ce club"}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border border-b border-border bg-card">
            {filtered.map((athlete) => {
              const pct = athlete.totalCount > 0 ? Math.round((athlete.completedCount / athlete.totalCount) * 100) : -1;
              return (
                <div key={athlete.userId}>
                  <button
                    onClick={() => onSelectAthlete(athlete.userId)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors active:bg-secondary/60"
                  >
                    {/* Avatar */}
                    <div className="h-11 w-11 rounded-full bg-secondary flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {athlete.avatarUrl ? (
                        <img src={athlete.avatarUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-[15px] font-bold text-muted-foreground">
                          {athlete.displayName.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-[16px] font-semibold text-foreground truncate">{athlete.displayName}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {athlete.username && (
                          <span className="text-[13px] text-muted-foreground truncate">@{athlete.username}</span>
                        )}
                        {athlete.groupName && (
                          <Badge
                            className="text-[10px] px-1.5 py-0 rounded-md border-0"
                            style={{ backgroundColor: `${athlete.groupColor}20`, color: athlete.groupColor || undefined }}
                          >
                            {athlete.groupName}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Right side */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {pct >= 0 && (
                        <Badge
                          variant={pct >= 80 ? "success" : pct >= 50 ? "warning" : "destructive"}
                          className="text-[11px] px-2 py-0.5 rounded-lg"
                        >
                          {pct}%
                        </Badge>
                      )}
                      <ChevronRightIcon className="h-4 w-4 text-muted-foreground/40" />
                    </div>
                  </button>
                </div>
              );
            })}
          </div>
        )}

        <div className="border-b border-border bg-card px-4 py-3">
          <p className="mb-2 text-[13px] font-semibold text-foreground">Créer un groupe</p>
          <div className="flex gap-2">
            <Input
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              placeholder="Nom du groupe"
              className="h-10 rounded-full border-border/60 bg-background text-[14px]"
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void createGroup();
                }
              }}
            />
            <Button
              type="button"
              size="sm"
              onClick={() => void createGroup()}
              disabled={!newGroupName.trim() || creatingGroup}
              className="h-10 rounded-full px-4 text-[13px] font-semibold"
            >
              {creatingGroup ? <Loader2 className="h-4 w-4 animate-spin" /> : "Ajouter"}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ==================== MODE DETAIL ====================
  const pct = selectedAthlete.totalCount > 0 ? Math.round((selectedAthlete.completedCount / selectedAthlete.totalCount) * 100) : 0;
  const selectedDayData = selectedDayKey ? selectedAthlete.days[selectedDayKey] : undefined;
  const selectedStatus = toUiStatus(selectedDayData?.status);
  const selectedFelt = selectedDayData ? parseAthleteBlockRpeFelt(selectedDayData.athleteRpeFelt, 12) : [];
  const selectedAvgRpe = selectedFelt.length > 0 ? Math.round(selectedFelt.reduce((a, b) => a + b, 0) / selectedFelt.length) : null;
  const selectedDetails = selectedDayData
    ? [
        selectedDayData.session.distance_km ? `${Math.round(Number(selectedDayData.session.distance_km) * 10) / 10} km` : "",
        selectedDayData.session.pace_target ? `Allure ${selectedDayData.session.pace_target}` : "",
      ]
        .filter(Boolean)
        .join(" • ") || "Séance planifiée"
    : "";

  return (
    <div className="space-y-0 pb-[calc(1.25rem+var(--safe-area-bottom))]">
      <AthleteHeader
        displayName={selectedAthlete.displayName}
        avatarUrl={selectedAthlete.avatarUrl}
        username={selectedAthlete.username}
        groupName={selectedAthlete.groupName}
        status={pct >= 70 ? "active" : "late"}
        coachRecordsSummary={coachRecordSummary}
        onMessage={() => void openConversationWithAthlete(selectedAthlete.userId)}
        onViewProfile={() => navigateToProfile(selectedAthlete.userId)}
      />

      <div className="border-b border-border bg-card px-4 py-3">
        <div className="rounded-2xl border border-border/60 bg-secondary/25 p-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[14px] font-semibold text-foreground">Records privés coach</p>
              <p className="mt-0.5 text-[12px] text-muted-foreground">
                Utilisés en priorité pour calculer les zones et l'intensité réelle de l'athlète.
              </p>
            </div>
            <Button type="button" variant="outline" size="sm" className="h-8 rounded-full px-3 text-[12px] font-semibold" onClick={openRecordsEditor}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Gérer
            </Button>
          </div>
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
            {selectedAthlete.coachPrivateRows.filter((row) => row.sport_key === "running").length > 0 ? (
              selectedAthlete.coachPrivateRows.filter((row) => row.sport_key === "running").map((row) => (
                <div key={row.id} className="rounded-xl bg-background px-3 py-2">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{row.event_label}</p>
                  <p className="text-[14px] font-semibold text-foreground">{row.record_value}</p>
                </div>
              ))
            ) : (
              <p className="text-[12px] text-muted-foreground">Aucun record privé coach renseigné.</p>
            )}
          </div>
          {selectedAthleteIntensity && selectedFeedback ? (
            <p className="mt-3 text-[12px] font-medium text-primary">Feedback calculé : {selectedFeedback}</p>
          ) : null}
        </div>
      </div>

      <div className="border-b border-border bg-card px-4 py-3">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setCurrentWeek(subWeeks(currentWeek, 1))}
            className="h-9 w-9 rounded-xl bg-secondary flex items-center justify-center active:scale-95 transition-transform"
            aria-label="Semaine précédente"
          >
            <ChevronLeft className="h-4 w-4 text-primary" />
          </button>
          <p className="inline-flex items-center gap-1.5 text-[16px] font-semibold text-foreground">
            {weekLabel}
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
          </p>
          <button
            onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))}
            className="h-9 w-9 rounded-xl bg-secondary flex items-center justify-center active:scale-95 transition-transform"
            aria-label="Semaine suivante"
          >
            <ChevronRight className="h-4 w-4 text-primary" />
          </button>
        </div>
        <div className="mt-3 grid grid-cols-7 gap-1.5">
          {weekDays.map((day) => {
            const dayKey = format(day, "yyyy-MM-dd");
            const dayData = selectedAthlete.days[dayKey];
            const isSelected = dayKey === selectedDayKey;
            const value = dayData ? sessionSummaryValue(dayData.session) : null;
            const sport: CalendarSport = !dayData
              ? "rest"
              : isRestSession(dayData.session)
              ? "rest"
              : dayData.session.activity_type === "cycling"
              ? "cycling"
              : dayData.session.activity_type === "swimming"
              ? "swimming"
              : dayData.session.activity_type === "strength"
              ? "strength"
              : "running";
            return (
              <button
                key={dayKey}
                type="button"
                onClick={() => setSelectedDayKey(dayKey)}
                className={`flex flex-col items-center rounded-lg px-1.5 py-2 transition-all ${isSelected ? "bg-[#2563EB]" : "bg-secondary"}`}
              >
                <p className={`text-[16px] font-semibold leading-none ${isSelected ? "text-white" : "text-foreground"}`}>{format(day, "d", { locale: fr })}</p>
                <p className={`mt-1 text-[11px] font-medium leading-none ${isSelected ? "text-white/90" : "text-muted-foreground"}`}>
                  {format(day, "EEE", { locale: fr }).slice(0, 1).toUpperCase()}
                </p>
                {value ? (
                  <div className="mt-1.5 flex min-h-[24px] flex-col items-center justify-center">
                    <SessionIcon sport={sport} className={`h-3 w-3 ${sessionTone(sport)}`} />
                    <p className={`mt-0.5 text-[10px] font-medium leading-none ${sessionTone(sport)}`}>{value}</p>
                  </div>
                ) : (
                  <div className="min-h-[24px]" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="border-b border-border bg-card px-4 pb-3 pt-2">
        <div className="flex flex-col divide-y divide-border border-t border-border">
          {selectedDayData ? (
            <AthleteSessionCard
              key={`${selectedDayData.sessionId}-${selectedDayKey}`}
              dayLabel={format(new Date(selectedDayData.session.scheduled_at), "EEE", { locale: fr }).toUpperCase()}
              dayNumber={format(new Date(selectedDayData.session.scheduled_at), "d", { locale: fr })}
              title={selectedDayData.sessionTitle}
              details={selectedDetails}
              status={selectedStatus === "none" ? "pending" : selectedStatus}
              note={selectedDayData.note}
              rpeLabel={selectedAvgRpe != null ? `RPE ${selectedAvgRpe}/10` : undefined}
              objective={selectedDayData.session.objective}
              onReply={() => void openConversationWithAthlete(selectedAthlete.userId)}
              onOpen={() => void handleRescheduleSession(selectedDayData.sessionId)}
            />
          ) : (
            <div className="bg-secondary/20 px-3 py-6 text-center">
              <p className="text-[13px] text-muted-foreground">Aucune séance sur ce jour.</p>
            </div>
          )}
        </div>
      </div>
      <ProfilePreviewDialog userId={selectedUserId} onClose={closeProfilePreview} />

      <Dialog open={recordsDialogOpen} onOpenChange={setRecordsDialogOpen}>
        <DialogContent className="max-w-[calc(100vw-24px)] rounded-3xl p-0 sm:max-w-lg">
          <DialogTitle className="sr-only">Records privés coach</DialogTitle>
          <div className="space-y-4 p-4">
            <div>
              <p className="text-[18px] font-semibold text-foreground">Records privés coach</p>
              <p className="text-[13px] text-muted-foreground">Ces temps servent au calcul automatique des zones pour cet athlète.</p>
            </div>
            <div className="space-y-3">
              {recordsDraft.map((row, index) => (
                <div key={row.id ?? `draft-${index}`} className="rounded-2xl border border-border/60 bg-card p-3">
                  <div className="grid grid-cols-[1fr_1fr_auto] gap-2">
                    <Input
                      value={row.event_label}
                      onChange={(e) => setRecordsDraft((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, event_label: e.target.value } : item))}
                      placeholder="Épreuve (ex: 5 km)"
                      className="h-10 rounded-xl"
                    />
                    <Input
                      value={row.record_value}
                      onChange={(e) => setRecordsDraft((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, record_value: e.target.value } : item))}
                      placeholder="Temps (ex: 15:30)"
                      className="h-10 rounded-xl"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-10 w-10 rounded-xl"
                      onClick={() => setRecordsDraft((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <Textarea
                    value={row.note}
                    onChange={(e) => setRecordsDraft((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, note: e.target.value } : item))}
                    placeholder="Note privée coach (optionnel)"
                    className="mt-2 min-h-[72px] rounded-xl"
                  />
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between gap-2">
              <Button type="button" variant="outline" className="rounded-full" onClick={() => setRecordsDraft((current) => [...current, { event_label: "", record_value: "", note: "" }])}>
                <Plus className="mr-1.5 h-4 w-4" />
                Ajouter un record
              </Button>
              <Button type="button" className="rounded-full" onClick={() => void saveCoachPrivateRecords()} disabled={savingRecords}>
                <Save className="mr-1.5 h-4 w-4" />
                {savingRecords ? "Enregistrement..." : "Enregistrer"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
