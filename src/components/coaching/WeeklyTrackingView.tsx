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
  Search,
  ChevronRight as ChevronRightIcon,
  Bell,
  Loader2,
  Save,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import {
  format,
  startOfWeek,
  endOfWeek,
  addWeeks,
  subWeeks,
  eachDayOfInterval,
} from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import type { WeekSession } from "@/components/coaching/WeeklyPlanSessionEditor";
import { parseAthleteBlockRpeFelt } from "@/lib/sessionBlockRpe";
import { sessionBlocksToZoneChartSegments } from "@/lib/sessionBlockCalculations";
import { useNavigate } from "react-router-dom";
import { getOrCreateDirectConversation } from "@/lib/coachingMessaging";
import { SessionFeedback } from "@/components/coaching/tracking/SessionFeedback";
import {
  CoachAthleteFichePanel,
  type CoachAthleteSessionCard,
  type WeekBarChartDay,
} from "@/components/coaching/tracking/CoachAthleteFichePanel";
import { useProfileNavigation } from "@/hooks/useProfileNavigation";
import { ProfilePreviewDialog } from "@/components/ProfilePreviewDialog";
import { buildAthleteIntensityContext, computeAthletePaces, zoneToFeedback } from "@/lib/athleteWorkoutContext";
import { getZoneFromPace } from "@/lib/athleteIntensity";
import { mergeRunningRecords, runningRecordsFromPrivateRows, type CoachPrivateRecordRow } from "@/lib/coachPrivateRunningRecords";
import { parseAthleteRecords } from "@/lib/athleteIntensity";

const PREVIEW_ZONE_ORDER = ["Z1", "Z2", "Z3", "Z4", "Z5", "Z6"] as const;

function zoneToPreviewColorClass(zone?: string) {
  const normalized = typeof zone === "string" ? zone.toUpperCase() : "Z3";
  if (normalized === "Z1") return "bg-slate-400";
  if (normalized === "Z2") return "bg-[#2563EB]";
  if (normalized === "Z3") return "bg-green-500";
  if (normalized === "Z4") return "bg-yellow-400";
  if (normalized === "Z5") return "bg-orange-500";
  if (normalized === "Z6") return "bg-red-500";
  return "bg-green-500";
}

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
  session_blocks?: unknown;
}

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

type UiDayStatus = "done" | "missed" | "pending" | "none";

const toUiStatus = (status?: string): UiDayStatus => {
  if (status === "completed") return "done";
  if (status === "missed") return "missed";
  if (status === "pending") return "pending";
  return "none";
};

function formatPaceFromSeconds(totalSec?: number | null): string {
  if (!totalSec || !Number.isFinite(totalSec) || totalSec <= 0) return "—";
  const rounded = Math.round(totalSec);
  const min = Math.floor(rounded / 60);
  const sec = rounded % 60;
  return `${min}:${String(sec).padStart(2, "0")}/km`;
}

function formatDurationFromSeconds(totalSec?: number | null): string {
  if (!totalSec || !Number.isFinite(totalSec) || totalSec <= 0) return "—";
  const rounded = Math.round(totalSec);
  const hours = Math.floor(rounded / 3600);
  const minutes = Math.floor((rounded % 3600) / 60);
  const seconds = rounded % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function formatRecordDistanceLabel(distanceKm: number, distanceM: number): string {
  if (distanceKm >= 1) {
    return `${distanceKm.toLocaleString("fr-FR", { maximumFractionDigits: distanceKm % 1 === 0 ? 0 : 1 })} km`;
  }
  return `${Math.round(distanceM)} m`;
}

export const WeeklyTrackingView = ({
  clubId,
  selectedAthleteId,
  onSelectAthlete,
  onOpenPlanForAthlete,
}: WeeklyTrackingViewProps) => {
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
  const [weekListFilterKey, setWeekListFilterKey] = useState<string | null>(null);
  const [recordsDialogOpen, setRecordsDialogOpen] = useState(false);
  const [athleteProfileDialogOpen, setAthleteProfileDialogOpen] = useState(false);
  const [recordsDraft, setRecordsDraft] = useState<Array<{ id?: string; event_label: string; record_value: string; note: string }>>([]);
  const [savingRecords, setSavingRecords] = useState(false);
  const [nudgingAthlete, setNudgingAthlete] = useState(false);

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

  const weekStart = useMemo(() => startOfWeek(currentWeek, { weekStartsOn: 1 }), [currentWeek]);
  const weekEnd = useMemo(() => endOfWeek(currentWeek, { weekStartsOn: 1 }), [currentWeek]);
  const weekDays = useMemo(() => eachDayOfInterval({ start: weekStart, end: weekEnd }), [weekStart, weekEnd]);

  const [initialNavDone, setInitialNavDone] = useState(false);
  const [sessionDetailOpen, setSessionDetailOpen] = useState(false);
  const [sessionDetailDayKey, setSessionDetailDayKey] = useState<string | null>(null);
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
          .select("id, title, scheduled_at, distance_km, rcc_code, activity_type, objective, pace_target, rpe, session_blocks")
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
  const selectedAthleteProfileRecords = useMemo(() => {
    return parseAthleteRecords(selectedAthlete?.runningRecords ?? null).sort((a, b) => a.distanceM - b.distanceM);
  }, [selectedAthlete]);
  const selectedAthlete5kRecord = useMemo(
    () => selectedAthleteProfileRecords.find((record) => record.key === "5k") ?? null,
    [selectedAthleteProfileRecords]
  );
  const selectedAthleteZoneCards = useMemo(() => {
    const zones = selectedAthletePaces?.zones;
    if (!zones) return [];
    return PREVIEW_ZONE_ORDER.map((zone) => {
      const range = zones[zone];
      return {
        zone,
        minPace: formatPaceFromSeconds(range.maxPace),
        maxPace: formatPaceFromSeconds(range.minPace),
      };
    });
  }, [selectedAthletePaces]);

  const weekBarDays = useMemo((): WeekBarChartDay[] => {
    if (!selectedAthlete) return [];
    return weekDays.map((day) => {
      const key = format(day, "yyyy-MM-dd");
      const dd = selectedAthlete.days[key];
      const sess = dd?.session;
      const km = sess?.distance_km != null ? Number(sess.distance_km) : 0;
      const segments = km > 0 ? sessionBlocksToZoneChartSegments(sess?.session_blocks) : [];
      return {
        dateKey: key,
        dayOfMonth: day.getDate(),
        dayLetter: format(day, "EEE", { locale: fr }).slice(0, 1).toUpperCase(),
        km,
        segments,
        hasSession: !!dd,
      };
    });
  }, [selectedAthlete, weekDays]);

  const weekSessionCards = useMemo((): CoachAthleteSessionCard[] => {
    if (!selectedAthlete) return [];
    return weekDays
      .map((day) => {
        const key = format(day, "yyyy-MM-dd");
        const dd = selectedAthlete.days[key];
        if (!dd) return null;
        const km = dd.session.distance_km != null ? Number(dd.session.distance_km) : 0;
        return {
          dateKey: key,
          dayLabel: format(day, "EEEE d MMMM", { locale: fr }),
          title: dd.sessionTitle,
          km,
          status: toUiStatus(dd.status),
          segments: sessionBlocksToZoneChartSegments(dd.session.session_blocks),
        };
      })
      .filter(Boolean) as CoachAthleteSessionCard[];
  }, [selectedAthlete, weekDays]);

  const ficheRecordRows = useMemo(() => {
    if (!selectedAthlete) return [];
    const parsed = parseAthleteRecords(selectedMergedRunningRecords).sort((a, b) => a.distanceM - b.distanceM);
    const zonesMap = selectedAthletePaces?.zones;
    return parsed.slice(0, 3).map((r) => {
      let meta: string | undefined;
      if (zonesMap && r.paceSecPerKm) {
        const z = getZoneFromPace(r.paceSecPerKm, zonesMap);
        if (z) meta = `${z} · ${formatPaceFromSeconds(r.paceSecPerKm)}`;
      }
      return {
        label: formatRecordDistanceLabel(r.distanceKm, r.distanceM),
        value: formatDurationFromSeconds(r.timeSec),
        meta,
      };
    });
  }, [selectedAthlete, selectedMergedRunningRecords, selectedAthletePaces?.zones]);

  const recordsFooterLine = useMemo(() => {
    const first = ficheRecordRows[0];
    if (!first) return "Ajoute des records sur le profil ou en privé coach pour calculer les zones.";
    return `Allures calculées à partir des records de l'athlète (${first.label} · ${first.value}).`;
  }, [ficheRecordRows]);

  const ficheZoneRows = useMemo(
    () =>
      selectedAthleteZoneCards.map((z) => ({
        zone: z.zone,
        minPace: z.minPace,
        maxPace: z.maxPace,
      })),
    [selectedAthleteZoneCards]
  );

  const feedbackDayData = useMemo(() => {
    if (!selectedAthlete) return undefined;
    if (weekListFilterKey) return selectedAthlete.days[weekListFilterKey];
    const hit = weekDays.find((d) => selectedAthlete.days[format(d, "yyyy-MM-dd")]);
    return hit ? selectedAthlete.days[format(hit, "yyyy-MM-dd")] : undefined;
  }, [selectedAthlete, weekListFilterKey, weekDays]);

  const sessionDetailData = selectedAthlete && sessionDetailDayKey ? selectedAthlete.days[sessionDetailDayKey] : undefined;
  const sessionDetailAvgRpe = useMemo(() => {
    if (!sessionDetailData) return null;
    const felt = parseAthleteBlockRpeFelt(sessionDetailData.athleteRpeFelt, 12);
    if (!felt.length) return null;
    return Math.round(felt.reduce((a, b) => a + b, 0) / felt.length);
  }, [sessionDetailData]);
  const selectedFeedback = useMemo(() => {
    const zones = selectedAthletePaces?.zones;
    const selectedPace = feedbackDayData?.session?.pace_target;
    if (!zones || !selectedPace) return undefined;
    const [min, sec] = selectedPace.split(":").map(Number);
    if (!Number.isFinite(min) || !Number.isFinite(sec)) return undefined;
    const pace = min * 60 + sec;
    const zone = getZoneFromPace(pace, zones);
    return zone ? zoneToFeedback(zone) : undefined;
  }, [selectedAthletePaces, feedbackDayData]);

  const athleteHasLateSessions = useMemo(() => {
    if (!selectedAthlete) return false;
    const now = new Date();
    return Object.entries(selectedAthlete.days).some(
      ([dayKey, d]) => new Date(dayKey) < now && d.status !== "completed"
    );
  }, [selectedAthlete]);

  const handleNudgeThisAthlete = useCallback(async () => {
    if (!selectedAthlete || !user) return;
    if (!athleteHasLateSessions) {
      toast.info("Rappel", { description: "Aucune séance en retard à relancer pour cet athlète." });
      return;
    }
    setNudgingAthlete(true);
    try {
      await sendPushNotification(
        selectedAthlete.userId,
        "⏰ Rappel de votre coach",
        "N'oubliez pas de valider vos séances !",
        "coaching_reminder"
      );
      toast.success("Relance envoyée");
    } catch {
      toast.error("Impossible d'envoyer la relance");
    } finally {
      setNudgingAthlete(false);
    }
  }, [athleteHasLateSessions, selectedAthlete, sendPushNotification, user]);

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

  const openSessionDetail = useCallback((dayKey: string) => {
    setSessionDetailDayKey(dayKey);
    setSessionDetailOpen(true);
  }, []);

  useEffect(() => {
    if (!selectedAthlete) {
      setWeekListFilterKey(null);
      setSessionDetailOpen(false);
      setSessionDetailDayKey(null);
      return;
    }
  }, [selectedAthlete]);

  useEffect(() => {
    setWeekListFilterKey(null);
  }, [weekStart, selectedAthlete?.userId]);

  useEffect(() => {
    if (!recordsDialogOpen || !selectedAthlete) return;
    const runningRows = (selectedAthlete.coachPrivateRows || []).filter((row) => row.sport_key === "running");
    setRecordsDraft(
      runningRows.length
        ? runningRows.map((row) => ({
            id: row.id,
            event_label: row.event_label,
            record_value: row.record_value,
            note: row.note ?? "",
          }))
        : [{ event_label: "", record_value: "", note: "" }]
    );
  }, [recordsDialogOpen, selectedAthlete]);

  const weekLabel = `${format(weekStart, "d MMM", { locale: fr })} – ${format(weekEnd, "d MMM", { locale: fr })}`.toUpperCase();
  const totalAthletes = athletes.length;
  const displayedAthletes = filtered.length;

  // ==================== MODE LISTE ====================
  if (!selectedAthlete) {
    if (selectedAthleteId && loading) {
      return (
        <div className="apple-grouped-bg min-h-[50vh] px-5 pb-8 pt-[max(0.5rem,env(safe-area-inset-top))]">
          <div className="mb-6 flex justify-between">
            <div className="h-9 w-28 animate-pulse rounded-lg bg-muted/80" />
            <div className="h-9 w-9 animate-pulse rounded-full bg-muted/80" />
          </div>
          <div className="flex gap-3.5">
            <div className="h-16 w-16 shrink-0 animate-pulse rounded-full bg-muted/80" />
            <div className="min-w-0 flex-1 space-y-2 pt-1">
              <div className="h-7 w-[60%] max-w-[200px] animate-pulse rounded-md bg-muted/80" />
              <div className="h-4 w-full animate-pulse rounded-md bg-muted/60" />
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <div className="h-11 flex-1 animate-pulse rounded-[12px] bg-muted/80" />
            <div className="h-11 flex-1 animate-pulse rounded-[12px] bg-muted/80" />
            <div className="h-11 w-[88px] shrink-0 animate-pulse rounded-[12px] bg-muted/60" />
          </div>
          <div className="mt-8 h-4 w-32 animate-pulse rounded bg-muted/70" />
          <div className="mt-3 grid grid-cols-7 gap-1">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="aspect-square animate-pulse rounded-[10px] bg-muted/70" />
            ))}
          </div>
          <div className="mt-8 h-4 w-40 animate-pulse rounded bg-muted/70" />
          <div className="mt-2 h-28 animate-pulse rounded-[16px] bg-muted/60" />
        </div>
      );
    }
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

  const ficheSubtitleParts = [
    selectedAthlete.groupName ?? null,
    selectedAthlete.username ? `@${selectedAthlete.username}` : null,
    selectedAthlete.totalCount > 0 ? `${pct}% réalisé cette semaine` : null,
  ].filter(Boolean);
  const ficheSubtitle = ficheSubtitleParts.join(" · ") || "Membre du club";

  const toggleWeekListDay = useCallback((key: string) => {
    setWeekListFilterKey((prev) => (prev === key ? null : key));
  }, []);

  const onSessionCardNavigate = useCallback((key: string) => {
    setWeekListFilterKey((prev) => {
      if (prev === null) return key;
      if (prev === key) return null;
      return key;
    });
  }, []);

  return (
    <div className="mx-auto flex min-h-0 min-w-0 w-full max-w-[1180px] flex-1 flex-col space-y-0">
      <CoachAthleteFichePanel
        userId={selectedAthlete.userId}
        displayName={selectedAthlete.displayName}
        avatarUrl={selectedAthlete.avatarUrl}
        subtitle={ficheSubtitle}
        onMessage={() => void openConversationWithAthlete(selectedAthlete.userId)}
        onViewProfile={() => navigateToProfile(selectedAthlete.userId)}
        onNudgeAthlete={() => void handleNudgeThisAthlete()}
        nudgeLoading={nudgingAthlete}
        nudgeDisabled={!athleteHasLateSessions}
        weekLabel={weekLabel}
        onPreviousWeek={() => setCurrentWeek(subWeeks(currentWeek, 1))}
        onNextWeek={() => setCurrentWeek(addWeeks(currentWeek, 1))}
        weekBarDays={weekBarDays}
        selectedWeekListDayKey={weekListFilterKey}
        onToggleWeekChartDay={toggleWeekListDay}
        weekSessionCards={weekSessionCards}
        onSessionCardNavigate={onSessionCardNavigate}
        onOpenSessionDetail={openSessionDetail}
        onManageRecords={() => setRecordsDialogOpen(true)}
        zones={ficheZoneRows}
        recordsFooterLine={recordsFooterLine}
        onSendSession={() => {
          if (onOpenPlanForAthlete) {
            onOpenPlanForAthlete(
              selectedAthlete.userId,
              selectedAthlete.displayName,
              selectedAthlete.groupId ?? undefined,
              weekStart
            );
            return;
          }
          toast.info("Planification", { description: "Ouvre la planification depuis l'onglet Coaching pour envoyer une séance." });
        }}
      />
      <ProfilePreviewDialog userId={selectedUserId} onClose={closeProfilePreview} />

      <Dialog open={sessionDetailOpen} onOpenChange={setSessionDetailOpen}>
        <DialogContent
          fullScreen
          hideCloseButton
          className="overflow-hidden bg-secondary p-0 duration-300 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:slide-in-from-bottom-[18px] data-[state=closed]:slide-out-to-bottom-[18px] data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0"
        >
          <DialogTitle className="sr-only">Détail séance</DialogTitle>
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="shrink-0 border-b border-border bg-card px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
              <div className="relative flex min-h-[44px] items-center">
                <button
                  type="button"
                  onClick={() => setSessionDetailOpen(false)}
                  className="flex min-w-0 items-center gap-ios-1 text-primary active:opacity-70"
                  aria-label="Retour"
                >
                  <ChevronLeft className="h-6 w-6 shrink-0" />
                  <span className="truncate text-ios-headline">Retour</span>
                </button>
                <p className="pointer-events-none absolute left-1/2 -translate-x-1/2 text-[17px] font-semibold text-foreground">
                  Séance athlète
                </p>
              </div>
            </div>
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
              {sessionDetailData ? (
                <>
                  {sessionDetailData.session ? (
                    <div className="rounded-2xl border border-border/60 bg-card p-3">
                      <p className="text-[16px] font-semibold text-foreground">{sessionDetailData.sessionTitle}</p>
                      <p className="mt-1 text-[13px] text-muted-foreground">
                        {format(new Date(sessionDetailData.session.scheduled_at), "EEEE d MMMM", { locale: fr })}{" "}
                        {sessionDetailData.session.distance_km ? `• ${Math.round(Number(sessionDetailData.session.distance_km) * 10) / 10} km` : ""}
                      </p>
                      {sessionDetailData.session.pace_target ? (
                        <p className="mt-1 text-[13px] text-muted-foreground">Allure cible: {sessionDetailData.session.pace_target}</p>
                      ) : null}
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-border/60 bg-card p-3 text-[13px] text-muted-foreground">
                      Détail séance indisponible pour cette entrée.
                    </div>
                  )}

                  <div className="rounded-2xl border border-border/60 bg-card p-3">
                    <p className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">Commentaire athlète</p>
                    <SessionFeedback note={sessionDetailData.note} rpeLabel={sessionDetailAvgRpe != null ? `RPE ${sessionDetailAvgRpe}/10` : undefined} />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mt-3 h-9 rounded-lg text-[12px] font-semibold"
                      onClick={() => void openConversationWithAthlete(selectedAthlete.userId)}
                    >
                      Répondre
                    </Button>
                  </div>
                </>
              ) : (
                <div className="rounded-2xl border border-border/60 bg-card p-3 text-[13px] text-muted-foreground">
                  Aucune donnée disponible pour cette séance.
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={athleteProfileDialogOpen} onOpenChange={setAthleteProfileDialogOpen}>
        <DialogContent
          hideCloseButton
          className="fixed bottom-0 left-0 right-0 top-auto w-full max-w-none translate-x-0 translate-y-0 rounded-t-[20px] border border-border/70 bg-card p-0"
        >
          <DialogTitle className="sr-only">Profil athlète</DialogTitle>
          <div className="flex max-h-[88vh] min-h-0 flex-col">
            <div className="shrink-0 border-b border-border px-4 pb-3 pt-3">
              <div className="relative flex min-h-[42px] items-center justify-center">
                <p className="text-[17px] font-semibold text-foreground">Profil athlète</p>
                <button
                  type="button"
                  onClick={() => setAthleteProfileDialogOpen(false)}
                  className="absolute right-0 inline-flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-foreground"
                  aria-label="Fermer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
              <div className="rounded-2xl border border-border/70 bg-secondary/20 p-3 text-[13px] text-muted-foreground">
                Ces zones sont calculées automatiquement à partir des records du profil.
              </div>

              <div className="rounded-2xl border border-border/70 bg-background p-3">
                <p className="text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">Records utilisés</p>
                <p className="mt-2 text-[15px] font-semibold text-foreground">
                  5 km : {selectedAthlete5kRecord ? formatDurationFromSeconds(selectedAthlete5kRecord.timeSec) : "—"}
                </p>
                <button
                  type="button"
                  onClick={() => navigate("/profile/records")}
                  className="mt-2 text-[13px] font-semibold text-[#2563EB]"
                >
                  Modifier les records
                </button>
              </div>

              <div className="rounded-2xl border border-border/70 bg-background p-3">
                <p className="text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">Zones</p>
                {selectedAthleteZoneCards.length > 0 ? (
                  <div className="mt-2 space-y-2">
                    {selectedAthleteZoneCards.map((zone) => (
                      <div key={zone.zone} className="flex items-center gap-2 rounded-lg bg-secondary/40 px-3 py-2 text-[13px]">
                        <span className={`h-2.5 w-2.5 rounded-full ${zoneToPreviewColorClass(zone.zone)}`} />
                        <span className="w-7 font-semibold text-foreground">{zone.zone}</span>
                        <span className="text-muted-foreground">{zone.minPace} → {zone.maxPace}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 text-[13px] text-muted-foreground">Ajoute un record pour générer tes zones</p>
                )}
              </div>

              <div className="rounded-2xl border border-border/70 bg-secondary/20 p-3 text-[12px] text-muted-foreground">
                Ces allures sont indicatives. Adapte selon tes sensations.
              </div>
              {selectedAthleteIntensity && selectedFeedback ? (
                <p className="px-1 text-[12px] font-medium text-primary">Feedback calculé : {selectedFeedback}</p>
              ) : null}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={recordsDialogOpen} onOpenChange={setRecordsDialogOpen}>
        <DialogContent fullScreen hideCloseButton className="overflow-hidden bg-secondary p-0">
          <DialogTitle className="sr-only">Records privés coach</DialogTitle>
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="shrink-0 border-b border-border bg-card px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
              <div className="relative flex min-h-[44px] items-center">
                <button
                  type="button"
                  onClick={() => setRecordsDialogOpen(false)}
                  className="flex min-w-0 items-center gap-ios-1 text-primary active:opacity-70"
                  aria-label="Retour"
                >
                  <ChevronLeft className="h-6 w-6 shrink-0" />
                  <span className="truncate text-ios-headline">Retour</span>
                </button>
                <p className="pointer-events-none absolute left-1/2 -translate-x-1/2 text-[17px] font-semibold text-foreground">
                  Records privés coach
                </p>
              </div>
              <p className="text-[13px] text-muted-foreground">
                Ces temps servent au calcul automatique des zones pour cet athlète. Les records profil sont visibles juste en dessous.
              </p>
            </div>
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[0.95fr_1.25fr]">
              {selectedAthleteProfileRecords.length > 0 ? (
                <div className="rounded-2xl border border-primary/20 bg-primary/5 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-primary">Déjà sur le profil athlète</p>
                  <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {selectedAthleteProfileRecords.map((record) => (
                      <div key={`profile-record-${record.key}-${record.timeSec}`} className="rounded-lg border border-border/50 bg-background px-3 py-2">
                        <p className="text-[11px] text-muted-foreground">
                          {record.distanceKm >= 1
                            ? `${record.distanceKm.toLocaleString("fr-FR", { maximumFractionDigits: record.distanceKm % 1 === 0 ? 0 : 1 })} km`
                            : `${Math.round(record.distanceM)} m`}
                        </p>
                        <p className="text-[14px] font-semibold text-foreground">{formatDurationFromSeconds(record.timeSec)}</p>
                        <p className="text-[11px] text-muted-foreground">{formatPaceFromSeconds(record.paceSecPerKm)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-border/70 bg-secondary/20 p-3 text-[12px] text-muted-foreground">
                  Aucun record détecté sur le profil athlète.
                </div>
              )}
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
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
