import { useCallback, useEffect, useMemo, useState } from "react";
import { addDays, addWeeks, format, isSameDay, startOfWeek, subWeeks } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Bike,
  ChevronLeft,
  Dumbbell,
  Flame,
  Leaf,
  Minus,
  Plus,
  Waves,
  Zap,
} from "lucide-react";
import { IosFixedPageHeaderShell } from "@/components/layout/IosFixedPageHeaderShell";
import { IosPageHeaderBar } from "@/components/layout/IosPageHeaderBar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { WheelValuePickerModal } from "@/components/ui/ios-wheel-picker";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useEnhancedToast } from "@/hooks/useEnhancedToast";
import { useAppContext } from "@/contexts/AppContext";
import { useLocation, useNavigate } from "react-router-dom";
import { PlanningHeader } from "@/components/coaching/planning/PlanningHeader";
import { PlanningSearchBar } from "@/components/coaching/planning/PlanningSearchBar";
import { WeekSelectorPremium } from "@/components/coaching/planning/WeekSelectorPremium";
import { DayPlanningRow } from "@/components/coaching/planning/DayPlanningRow";
import { AppDrawer, type CoachMenuKey } from "@/components/coaching/drawer/AppDrawer";
import { ModelsPage } from "@/components/coaching/models/ModelsPage";
import type { SessionModelItem } from "@/components/coaching/models/types";
import { parseRCC } from "@/lib/rccParser";
import { ClubManagementPage, type ClubMemberItem, type ClubGroupItem, type ClubInvitationItem, type ClubRole } from "@/components/coaching/club/ClubManagementPage";
import { InviteMembersDialog } from "@/components/InviteMembersDialog";
import { WeeklyTrackingView } from "@/components/coaching/WeeklyTrackingView";
import { ClubGroupsManager } from "@/components/coaching/ClubGroupsManager";
import { CoachDashboardPage } from "@/components/coaching/dashboard/CoachDashboardPage";
import { AthleteMyPlanView } from "@/components/coaching/athlete-plan/AthleteMyPlanView";
import type { AthleteCoachBrief, AthletePlanSessionModel } from "@/components/coaching/athlete-plan/types";
import { parseSport, sportLabel } from "@/components/coaching/athlete-plan/sportTokens";

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
  athleteIds?: string[];
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
  return `${Math.round(distance).toLocaleString("fr-FR")} m`;
}

function paceToLabel(paceSecPerKm?: number) {
  if (!paceSecPerKm || paceSecPerKm <= 0) return "";
  const min = Math.floor(paceSecPerKm / 60);
  const sec = paceSecPerKm % 60;
  return `${min}'${sec.toString().padStart(2, "0")}''/km`;
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

function paceStringToSecPerKm(pace?: string) {
  if (!pace) return undefined;
  const [min, sec] = pace.split(":").map(Number);
  if (!Number.isFinite(min) || !Number.isFinite(sec)) return undefined;
  return min * 60 + sec;
}

function parsedRccToSessionBlocks(rccCode: string): SessionBlock[] {
  const parsed = parseRCC(rccCode);
  return parsed.blocks.map((block, index) => ({
    id: uid(),
    order: index + 1,
    type: block.type,
    durationSec: block.duration ? block.duration * 60 : undefined,
    distanceM: block.distance ?? undefined,
    paceSecPerKm: paceStringToSecPerKm(block.pace),
    repetitions: block.repetitions ?? undefined,
    recoveryDurationSec: block.recoveryDuration ?? undefined,
    recoveryType:
      block.recoveryType === "marche" ? "walk" : block.recoveryType === "trot" ? "jog" : "easy",
    intensityMode: "zones",
    zone: "Z2",
  }));
}

function emptyDraft(dateIso: string): SessionDraft {
  return {
    title: "",
    sport: "running",
    assignedDate: dateIso,
    blocks: [],
  };
}

const BASE_MODELS: SessionModelItem[] = [
  {
    id: "base-endurance-40",
    source: "base",
    title: "Footing 40 min + 5 x 60m",
    activityType: "running",
    objective: "Z2 endurance",
    rccCode: "15'>5'45, 5x60>3'40 r45>trot, 10'>6'00",
    category: "endurance",
  },
  {
    id: "base-long-90",
    source: "base",
    title: "Sortie longue 1h30",
    activityType: "running",
    objective: "Endurance",
    rccCode: "90'>5'50",
    category: "endurance",
  },
  {
    id: "base-threshold-3x10",
    source: "base",
    title: "3 x 10 min allure seuil",
    activityType: "running",
    objective: "Z4 seuil",
    rccCode: "20'>5'25, 3x10'>4'10 r2'00>trot, 10'>5'50",
    category: "threshold",
  },
  {
    id: "base-vo2-10x400",
    source: "base",
    title: "10 x 400m",
    activityType: "running",
    objective: "VO2",
    rccCode: "15'>5'30, 10x400>3'30 r1'15>trot, 10'>5'55",
    category: "vo2",
  },
  {
    id: "base-recovery-30",
    source: "base",
    title: "Footing léger 30 min",
    activityType: "running",
    objective: "Récup",
    rccCode: "30'>6'05",
    category: "recovery",
  },
];

export function CoachPlanningExperience() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isActiveCoachingTab =
    location.pathname === "/coaching" || location.pathname.startsWith("/coaching/");
  const { setBottomNavSuppressed } = useAppContext();
  const toast = useEnhancedToast();
  const [weekAnchor, setWeekAnchor] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [search, setSearch] = useState("");
  const [clubs, setClubs] = useState<CoachClub[]>([]);
  const [memberClubIds, setMemberClubIds] = useState<string[]>([]);
  const [athletePlanSessions, setAthletePlanSessions] = useState<AthletePlanSessionModel[]>([]);
  const [prevWeekAthleteKm, setPrevWeekAthleteKm] = useState<number | null>(null);
  const [athletePlanLoading, setAthletePlanLoading] = useState(false);
  const [activeClubId, setActiveClubId] = useState<string | null>(null);
  const [isCoachMode, setIsCoachMode] = useState(true);
  const [viewAsAthlete, setViewAsAthlete] = useState(false);
  const [athletes, setAthletes] = useState<AthleteEntry[]>([]);
  const [groups, setGroups] = useState<GroupEntry[]>([]);
  const [groupMembers, setGroupMembers] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(false);
  const [sessions, setSessions] = useState<TrainingSession[]>([]);
  const [activeAthleteId, setActiveAthleteId] = useState<string | undefined>(undefined);
  const [activeGroupId, setActiveGroupId] = useState<string | undefined>(undefined);
  const [coachingTab, setCoachingTab] = useState<"planning" | "create">("planning");
  const [editorTab, setEditorTab] = useState<"build" | "models">("build");
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [draft, setDraft] = useState<SessionDraft>(() => emptyDraft(new Date().toISOString()));
  const [blockSheetOpen, setBlockSheetOpen] = useState(false);
  const [blockStep, setBlockStep] = useState<"type" | "config">("type");
  const [blockForm, setBlockForm] = useState<SessionBlock | null>(null);
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  const [wheelOpen, setWheelOpen] = useState(false);
  const [wheelTitle, setWheelTitle] = useState("");
  const [wheelColumns, setWheelColumns] = useState<Array<{ items: Array<{ value: string; label: string }>; value: string; onChange: (value: string) => void; suffix?: string }>>([]);
  const [applyWheel, setApplyWheel] = useState<(() => void) | null>(null);
  const [wheelA, setWheelA] = useState("0");
  const [wheelB, setWheelB] = useState("0");
  const [wheelC, setWheelC] = useState("0");
  const [wheelUnit, setWheelUnit] = useState("min/km");
  const [savePulse, setSavePulse] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [myModels, setMyModels] = useState<SessionModelItem[]>([]);
  const [clubMembers, setClubMembers] = useState<ClubMemberItem[]>([]);
  const [clubGroupsAdmin, setClubGroupsAdmin] = useState<ClubGroupItem[]>([]);
  const [clubInvitations, setClubInvitations] = useState<ClubInvitationItem[]>([]);
  const [clubLocation, setClubLocation] = useState<string | null>(null);
  const [clubAvatarUrl, setClubAvatarUrl] = useState<string | null>(null);
  const [plannedSessionsCount, setPlannedSessionsCount] = useState(0);
  const [validatedSessionsCount, setValidatedSessionsCount] = useState(0);
  const [trackingSelectedAthleteId, setTrackingSelectedAthleteId] = useState<string | null>(null);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeMenuKey, setActiveMenuKey] = useState<CoachMenuKey>("planning");
  const [copiedWeekSessions, setCopiedWeekSessions] = useState<TrainingSession[] | null>(null);
  const [copiedFromAthleteId, setCopiedFromAthleteId] = useState<string | null>(null);
  const effectiveAthleteMode = !isCoachMode || viewAsAthlete;

  const rotateActiveClub = () => {
    if (!clubs.length) return;
    setActiveClubId((prev) => {
      const currentIndex = clubs.findIndex((club) => club.id === prev);
      const nextIndex = currentIndex < 0 ? 0 : (currentIndex + 1) % clubs.length;
      return clubs[nextIndex]?.id ?? prev ?? null;
    });
  };

  // MainTabsSwipeHost garde les onglets montés : ne masquer la tab bar que si l’onglet Coaching est réellement visible.
  useEffect(() => {
    const hideTabBar = isActiveCoachingTab && coachingTab === "create";
    setBottomNavSuppressed("coaching-create", hideTabBar);
    return () => setBottomNavSuppressed("coaching-create", false);
  }, [isActiveCoachingTab, coachingTab, setBottomNavSuppressed]);

  useEffect(() => {
    if (!user || !effectiveAthleteMode) return;
    setActiveAthleteId(user.id);
    setActiveGroupId(undefined);
    setActiveMenuKey((prev) => (prev === "my-plan" ? prev : "my-plan"));
  }, [effectiveAthleteMode, user]);

  useEffect(() => {
    if (!user) return;
    let ignore = false;
    const loadTemplates = async () => {
      const { data, error } = await supabase
        .from("coaching_templates")
        .select("id, name, objective, activity_type, rcc_code")
        .eq("coach_id", user.id)
        .order("created_at", { ascending: false });
      if (ignore) return;
      if (error) {
        toast.error("Impossible de charger les modèles");
        return;
      }
      setMyModels(
        (data || []).map((row) => ({
          id: row.id,
          source: "mine" as const,
          title: row.name,
          activityType: row.activity_type || "running",
          objective: row.objective,
          rccCode: row.rcc_code,
        }))
      );
    };
    void loadTemplates();
    return () => {
      ignore = true;
    };
  }, [user, toast]);

  useEffect(() => {
    if (!user) return;
    let ignore = false;
    const loadCoachClubs = async () => {
      const { data: memberships } = await supabase
        .from("group_members")
        .select("conversation_id, is_coach")
        .eq("user_id", user.id);
      const allClubIds = Array.from(new Set((memberships || []).map((entry) => entry.conversation_id)));
      setMemberClubIds(allClubIds);
      const coachMemberships = (memberships || []).filter((entry) => entry.is_coach);
      const athleteMemberships = (memberships || []).filter((entry) => !entry.is_coach);
      const isCoach = coachMemberships.length > 0;
      const clubIds = (isCoach ? coachMemberships : athleteMemberships).map((entry) => entry.conversation_id);
      if (!clubIds.length) {
        if (!ignore) {
          setClubs([]);
          setMemberClubIds([]);
          setActiveClubId(null);
          setIsCoachMode(true);
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
      setIsCoachMode(isCoach);
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
    if (!activeClubId) return;
    let ignore = false;
    const loadClubAdmin = async () => {
      const [{ data: clubRow }, { data: groupRows }, { data: gmRows }, { data: invitationRows }] = await Promise.all([
        supabase
          .from("conversations")
          .select("group_name, group_avatar_url, location")
          .eq("id", activeClubId)
          .maybeSingle(),
        supabase.from("club_groups").select("id, name").eq("club_id", activeClubId).order("name", { ascending: true }),
        supabase.from("group_members").select("user_id, is_admin, is_coach").eq("conversation_id", activeClubId),
        supabase
          .from("club_invitations")
          .select("id, invited_user_id, status, created_at")
          .eq("club_id", activeClubId)
          .order("created_at", { ascending: false })
          .limit(20),
      ]);

      const memberIds = (gmRows || []).map((m) => m.user_id);
      const invitedIds = (invitationRows || []).map((i) => i.invited_user_id);
      const allProfileIds = Array.from(new Set([...memberIds, ...invitedIds]));
      const { data: profiles } = allProfileIds.length
        ? await supabase
            .from("profiles")
            .select("user_id, display_name, username, avatar_url")
            .in("user_id", allProfileIds)
        : { data: [] as Array<{ user_id: string; display_name: string | null; username: string | null; avatar_url: string | null }> };

      const profileById = new Map((profiles || []).map((p) => [p.user_id, p]));
      const { data: groupMembershipRows } = groupRows?.length
        ? await supabase
            .from("club_group_members")
            .select("group_id, user_id")
            .in("group_id", groupRows.map((g) => g.id))
        : { data: [] as Array<{ group_id: string; user_id: string }> };

      const groupByMember = new Map<string, string>();
      (groupMembershipRows || []).forEach((row) => {
        if (!groupByMember.has(row.user_id)) {
          const group = (groupRows || []).find((g) => g.id === row.group_id);
          if (group) groupByMember.set(row.user_id, group.name);
        }
      });

      const memberItems: ClubMemberItem[] = (gmRows || []).map((member) => {
        const profile = profileById.get(member.user_id);
        const role: ClubRole = member.is_admin ? "admin" : member.is_coach ? "coach" : "athlete";
        return {
          userId: member.user_id,
          displayName: profile?.display_name || profile?.username || "Membre",
          username: profile?.username,
          avatarUrl: profile?.avatar_url,
          role,
          groupLabel: groupByMember.get(member.user_id),
          status: "active",
        };
      });

      const groupItems: ClubGroupItem[] = (groupRows || []).map((group) => {
        const memberIdsInGroup = (groupMembershipRows || []).filter((gm) => gm.group_id === group.id).map((gm) => gm.user_id);
        const coachRef = memberItems.find((item) => memberIdsInGroup.includes(item.userId) && (item.role === "coach" || item.role === "admin"));
        return {
          id: group.id,
          name: group.name,
          athletesCount: memberIdsInGroup.length,
          coachName: coachRef?.displayName,
        };
      });

      const invitationItems: ClubInvitationItem[] = (invitationRows || []).map((inv) => {
        const profile = profileById.get(inv.invited_user_id);
        return {
          id: inv.id,
          displayLabel: profile?.display_name || profile?.username || "Invitation",
          role: "athlete",
          sentAt: format(new Date(inv.created_at), "d MMM", { locale: fr }),
          status: (inv.status as "pending" | "accepted" | "expired") || "pending",
        };
      });

      const weekEnd = addDays(weekAnchor, 7);
      const [{ count: plannedCount }, { data: weekSessions }] = await Promise.all([
        supabase
          .from("coaching_sessions")
          .select("id", { count: "exact", head: true })
          .eq("club_id", activeClubId)
          .gte("scheduled_at", weekAnchor.toISOString())
          .lt("scheduled_at", weekEnd.toISOString()),
        supabase
          .from("coaching_sessions")
          .select("id")
          .eq("club_id", activeClubId)
          .gte("scheduled_at", weekAnchor.toISOString())
          .lt("scheduled_at", weekEnd.toISOString()),
      ]);
      const weekSessionIds = (weekSessions || []).map((s) => s.id);
      const { count: validatedCount } = weekSessionIds.length
        ? await supabase
            .from("coaching_participations")
            .select("id", { count: "exact", head: true })
            .in("coaching_session_id", weekSessionIds)
            .eq("status", "completed")
        : { count: 0 };

      if (ignore) return;
      setClubMembers(memberItems);
      setClubGroupsAdmin(groupItems);
      setClubInvitations(invitationItems);
      setClubLocation(clubRow?.location || null);
      setClubAvatarUrl(clubRow?.group_avatar_url || null);
      setPlannedSessionsCount(plannedCount || 0);
      setValidatedSessionsCount(validatedCount || 0);
    };
    void loadClubAdmin();
    return () => {
      ignore = true;
    };
  }, [activeClubId, weekAnchor]);

  useEffect(() => {
    if (effectiveAthleteMode || !activeClubId || !user) return;
    let ignore = false;
    const loadWeekSessions = async () => {
      setLoading(true);
      const weekEnd = addDays(weekAnchor, 7);
      let query = supabase
        .from("coaching_sessions")
        .select("id, title, activity_type, scheduled_at, status, target_athletes, target_group_id, session_blocks")
        .eq("club_id", activeClubId)
        .gte("scheduled_at", weekAnchor.toISOString())
        .lt("scheduled_at", weekEnd.toISOString());
      query = query.eq("coach_id", user.id);
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
            const targetAthletes = Array.isArray(row.target_athletes)
              ? row.target_athletes.filter((value): value is string => typeof value === "string")
              : [];
            const targetAthlete = targetAthletes.length ? targetAthletes[0] : undefined;
            return {
              id: row.id,
              dbId: row.id,
              title: row.title,
              sport: (row.activity_type as SportType) || "running",
              assignedDate: row.scheduled_at,
              athleteId: targetAthlete,
              athleteIds: targetAthletes,
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
  }, [activeClubId, activeAthleteId, activeGroupId, effectiveAthleteMode, user, weekAnchor, toast]);

  const loadAthleteWeek = useCallback(async (opts?: { silent?: boolean }) => {
    if (!user || activeMenuKey !== "my-plan") return;
    if (!memberClubIds.length) {
      setAthletePlanSessions([]);
      setPrevWeekAthleteKm(null);
      setAthletePlanLoading(false);
      return;
    }
    if (!opts?.silent) {
      setAthletePlanLoading(true);
    }
    const weekEnd = addDays(weekAnchor, 7);
    const prevWeekStart = subWeeks(weekAnchor, 1);
    const prevWeekEnd = weekAnchor;
    try {
      const { data, error } = await supabase
        .from("coaching_sessions")
        .select(
          "id, title, activity_type, scheduled_at, status, target_athletes, target_group_id, session_blocks, coach_id, club_id, distance_km, objective, coach_notes, default_location_name, description"
        )
        .in("club_id", memberClubIds)
        .contains("target_athletes", [user.id])
        .eq("status", "sent")
        .gte("scheduled_at", weekAnchor.toISOString())
        .lt("scheduled_at", weekEnd.toISOString())
        .order("scheduled_at", { ascending: true });

      if (error) {
        toast.error("Impossible de charger Mon plan");
        setAthletePlanSessions([]);
        return;
      }

      const rows = data || [];
      const sessionIds = rows.map((r) => r.id);

      const { data: participations } = sessionIds.length
        ? await supabase
            .from("coaching_participations")
            .select("id, coaching_session_id, status, athlete_note, completed_at")
            .eq("user_id", user.id)
            .in("coaching_session_id", sessionIds)
        : { data: [] };

      const partBySession = new Map((participations || []).map((p) => [p.coaching_session_id, p]));

      const coachIds = [...new Set(rows.map((r) => r.coach_id))];
      const clubIds = [...new Set(rows.map((r) => r.club_id))];

      const [{ data: coachProfiles }, { data: convs }, { data: prevWeekRows }] = await Promise.all([
        coachIds.length
          ? supabase.from("profiles").select("user_id, display_name, username, avatar_url").in("user_id", coachIds)
          : Promise.resolve({ data: [] as Array<{ user_id: string; display_name: string | null; username: string | null; avatar_url: string | null }> }),
        clubIds.length
          ? supabase.from("conversations").select("id, group_name").in("id", clubIds)
          : Promise.resolve({ data: [] as Array<{ id: string; group_name: string | null }> }),
        supabase
          .from("coaching_sessions")
          .select("distance_km")
          .in("club_id", memberClubIds)
          .contains("target_athletes", [user.id])
          .eq("status", "sent")
          .gte("scheduled_at", prevWeekStart.toISOString())
          .lt("scheduled_at", prevWeekEnd.toISOString()),
      ]);

      const coachById = new Map((coachProfiles || []).map((p) => [p.user_id, p]));
      const clubById = new Map((convs || []).map((c) => [c.id, c.group_name || "Club"]));

      const prevKm = (prevWeekRows || []).reduce((acc, row) => {
        const dk = row.distance_km;
        return typeof dk === "number" && dk > 0 ? acc + dk : acc;
      }, 0);
      setPrevWeekAthleteKm(prevKm > 0 ? Math.round(prevKm * 10) / 10 : null);

      const mapped: AthletePlanSessionModel[] = rows.map((row) => {
        const rawBlocks = Array.isArray(row.session_blocks) ? row.session_blocks : [];
        const blocks = rawBlocks.map((block, index) => {
          const source = block as Record<string, unknown>;
          const intensityMode: "rpe" | "zones" = source.intensityMode === "rpe" ? "rpe" : "zones";
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
                ? (source.recoveryType as "walk" | "jog" | "easy")
                : undefined,
            intensityMode,
            zone,
            rpe: typeof source.rpe === "number" ? source.rpe : undefined,
            notes: typeof source.notes === "string" ? source.notes : undefined,
          };
        });
        const part = partBySession.get(row.id);
        const coach = coachById.get(row.coach_id);
        const coachName = coach?.display_name || coach?.username || "Coach";
        const clubName = clubById.get(row.club_id) || "Club";
        return {
          id: row.id,
          title: row.title,
          sport: parseSport(row.activity_type),
          assignedDate: row.scheduled_at,
          blocks,
          coachId: row.coach_id,
          coachName,
          coachAvatarUrl: coach?.avatar_url ?? null,
          clubId: row.club_id,
          clubName,
          participationId: part?.id ?? null,
          participationStatus: part?.status ?? null,
          athleteNote: part?.athlete_note ?? null,
          distanceKm: typeof row.distance_km === "number" ? row.distance_km : null,
          objective: row.objective,
          coachNotes: row.coach_notes,
          locationName: row.default_location_name,
          description: row.description,
          hasConflict: false,
        };
      });
      setAthletePlanSessions(mapped);
    } finally {
      setAthletePlanLoading(false);
    }
  }, [user, activeMenuKey, memberClubIds, weekAnchor, toast]);

  useEffect(() => {
    void loadAthleteWeek();
  }, [loadAthleteWeek]);

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
    () => {
      // En mode coach planning : n'afficher des séances QUE si un athlète ou un groupe est sélectionné.
      // Évite la surcharge visuelle (séances de tous les athlètes mélangées).
      if (!effectiveAthleteMode && !activeAthleteId && !activeGroupId) return [];
      return sessions.filter((s) => {
        if (activeAthleteId) {
          const athleteMatches =
            s.athleteId === activeAthleteId ||
            (Array.isArray(s.athleteIds) && s.athleteIds.includes(activeAthleteId));
          if (!athleteMatches) return false;
        }
        if (activeGroupId && s.groupId !== activeGroupId) return false;
        return true;
      });
    },
    [sessions, activeAthleteId, activeGroupId, effectiveAthleteMode]
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

  const unsendSession = async (sessionId: string) => {
    const { error: sessionError } = await supabase.from("coaching_sessions").update({ status: "draft" }).eq("id", sessionId);
    if (sessionError) {
      toast.error("Annulation impossible", sessionError.message);
      return;
    }
    const { error: partError } = await supabase
      .from("coaching_participations")
      .delete()
      .eq("coaching_session_id", sessionId)
      .eq("status", "sent");
    if (partError) {
      toast.error("Annulation partielle", partError.message);
      return;
    }
    setSessions((prev) => prev.map((entry) => (entry.id === sessionId ? { ...entry, sent: false } : entry)));
    toast.success("Envoi annulé");
  };

  const copyAthleteWeek = () => {
    if (!activeAthleteId) return;
    const source = filteredSessions
      .filter((session) => session.athleteId === activeAthleteId)
      .map((session) => ({ ...session, blocks: session.blocks.map((b) => ({ ...b })) }));
    if (!source.length) {
      toast.info("Aucune séance à copier pour cet athlète");
      return;
    }
    setCopiedWeekSessions(source);
    setCopiedFromAthleteId(activeAthleteId);
    toast.success("Semaine copiée");
  };

  const pasteAthleteWeek = async () => {
    if (!activeAthleteId || !copiedWeekSessions?.length || !activeClubId || !user) return;
    const copied = copiedWeekSessions;
    for (const session of copied) {
      const payload = {
        club_id: activeClubId,
        coach_id: user.id,
        title: session.title,
        objective: session.title,
        activity_type: session.sport,
        scheduled_at: session.assignedDate,
        target_group_id: session.groupId || null,
        target_athletes: [activeAthleteId],
        send_mode: session.groupId ? "group" : "club",
        status: session.sent ? "sent" : "draft",
        session_blocks: session.blocks,
        distance_km:
          session.blocks.reduce((acc, block) => acc + (block.distanceM || 0) * (block.repetitions || 1), 0) / 1000 || null,
      };
      const { data, error } = await supabase.from("coaching_sessions").insert(payload).select("id").single();
      if (error) {
        toast.error("Collage impossible", error.message);
        return;
      }
      setSessions((prev) => [
        ...prev,
        {
          ...session,
          id: data.id,
          dbId: data.id,
          athleteId: activeAthleteId,
          blocks: session.blocks.map((b) => ({ ...b, id: uid() })),
        },
      ]);
    }
    toast.success("Semaine collée");
  };

  const createModelFromDraft = async () => {
    if (!user) return;
    const name = window.prompt("Nom du modèle", draft.title || "Nouveau modèle");
    if (!name?.trim()) return;
    const rccCode = window.prompt("Code séance (RCC)", "20'>5'30, 10'>4'20, 10'>5'45");
    if (!rccCode?.trim()) return;
    const payload = {
      coach_id: user.id,
      name: name.trim(),
      objective: draft.title || null,
      activity_type: draft.sport,
      rcc_code: rccCode.trim(),
    };
    const { data, error } = await supabase.from("coaching_templates").insert(payload).select("id").single();
    if (error) {
      toast.error("Création du modèle impossible", error.message);
      return;
    }
    setMyModels((prev) => [
      {
        id: data.id,
        source: "mine",
        title: payload.name,
        objective: payload.objective,
        activityType: payload.activity_type,
        rccCode: payload.rcc_code,
      },
      ...prev,
    ]);
    toast.success("Modèle créé");
  };

  const addModelToPlanning = async (model: SessionModelItem, day: Date, replaceExisting: boolean): Promise<boolean> => {
    if (!activeClubId || !user) return false;
    const dayIso = day.toISOString();
    const existing = sessions.find((session) => isSameDay(new Date(session.assignedDate), day));
    if (existing && replaceExisting) {
      await removeSession(existing.id);
    }
    const blocks = parsedRccToSessionBlocks(model.rccCode);
    const totalDistanceKm =
      blocks.reduce((acc, block) => acc + (block.distanceM || 0) * (block.repetitions || 1), 0) / 1000;
    const targetAthletes = activeAthleteId ? [activeAthleteId] : null;
    const payload = {
      club_id: activeClubId,
      coach_id: user.id,
      title: model.title,
      objective: model.objective || model.title,
      activity_type: model.activityType || "running",
      scheduled_at: dayIso,
      target_group_id: activeGroupId || null,
      target_athletes: targetAthletes,
      send_mode: activeGroupId ? "group" : "club",
      status: "draft",
      session_blocks: blocks,
      distance_km: totalDistanceKm > 0 ? totalDistanceKm : null,
    };
    const { data, error } = await supabase.from("coaching_sessions").insert(payload).select("id").single();
    if (error) {
      toast.error("Ajout au planning impossible", error.message);
      return false;
    }
    const created: TrainingSession = {
      id: data.id,
      dbId: data.id,
      title: model.title,
      sport: (model.activityType as SportType) || "running",
      assignedDate: dayIso,
      athleteId: activeAthleteId,
      groupId: activeGroupId,
      sent: false,
      blocks,
    };
    setSessions((prev) => [...prev.filter((s) => !(replaceExisting && existing && s.id === existing.id)), created]);
    toast.success("Séance ajoutée au planning");
    return true;
  };

  const editModel = (model: SessionModelItem) => {
    setDraft({
      title: model.title,
      sport: (model.activityType as SportType) || "running",
      assignedDate: draft.assignedDate,
      athleteId: activeAthleteId,
      groupId: activeGroupId,
      blocks: parsedRccToSessionBlocks(model.rccCode),
    });
    setEditorTab("build");
  };

  const duplicateModel = async (model: SessionModelItem) => {
    if (model.source !== "mine" || !user) return;
    const payload = {
      coach_id: user.id,
      name: `${model.title} (copie)`,
      objective: model.objective || null,
      activity_type: model.activityType,
      rcc_code: model.rccCode,
    };
    const { data, error } = await supabase.from("coaching_templates").insert(payload).select("id").single();
    if (error) {
      toast.error("Duplication impossible", error.message);
      return;
    }
    setMyModels((prev) => [{ ...model, id: data.id, title: payload.name }, ...prev]);
  };

  const deleteModel = async (model: SessionModelItem) => {
    if (model.source !== "mine") return;
    const { error } = await supabase.from("coaching_templates").delete().eq("id", model.id);
    if (error) {
      toast.error("Suppression impossible", error.message);
      return;
    }
    setMyModels((prev) => prev.filter((entry) => entry.id !== model.id));
  };

  const openWheelColumns = (title: string, columns: Array<{ items: Array<{ value: string; label: string }>; value: string; onChange: (value: string) => void; suffix?: string }>, onConfirm: () => void) => {
    setWheelTitle(title);
    setWheelColumns(columns);
    setApplyWheel(() => onConfirm);
    setWheelOpen(true);
  };

  const openWheel = (
    title: string,
    items: Array<{ value: string; label: string }>,
    currentValue: string,
    onConfirm: (next: string) => void
  ) => {
    setWheelA(currentValue);
    openWheelColumns(title, [{ items, value: currentValue, onChange: setWheelA }], () => onConfirm(wheelA));
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

  const existingSessionsByDay = useMemo(() => {
    const map: Record<string, string | undefined> = {};
    filteredSessions.forEach((session) => {
      const key = format(new Date(session.assignedDate), "yyyy-MM-dd");
      map[key] = session.title;
    });
    return map;
  }, [filteredSessions]);

  const activeClubName = clubs.find((club) => club.id === activeClubId)?.name;
  const coachName =
    (user?.user_metadata?.display_name as string | undefined) ||
    (user?.user_metadata?.full_name as string | undefined) ||
    (user?.email ? user.email.split("@")[0] : "Coach");
  const sectionTitle =
    activeMenuKey === "my-plan"
      ? "Mon plan"
      : activeMenuKey === "planning"
      ? "Planification"
      : activeMenuKey === "tracking"
      ? "Suivi athlète"
      : activeMenuKey === "templates"
      ? "Modèles"
      : activeMenuKey === "club"
      ? "Gérer le club"
      : activeMenuKey === "dashboard"
      ? "Tableau de bord"
      : "Coaching";
  const [showCoachRequiredDialog, setShowCoachRequiredDialog] = useState(false);
  const handleDrawerSelect = (key: CoachMenuKey) => {
    // Athlète sans rôle coach : tous les items "coach" déclenchent une popup d'invitation à créer un club.
    if (!isCoachMode && key !== "my-plan") {
      setDrawerOpen(false);
      setShowCoachRequiredDialog(true);
      return;
    }
    setActiveMenuKey(key);
    setDrawerOpen(false);
    if (key === "planning" || key === "my-plan") {
      setViewAsAthlete(key === "my-plan");
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
    if (key === "tracking") {
      setTrackingSelectedAthleteId(null);
    }
    // Keep in-coaching sections in place
    setCoachingTab("planning");
  };

  const openDirectMessage = async (memberId: string) => {
    if (!user) return;
    try {
      const { getOrCreateDirectConversation } = await import("@/lib/coachingMessaging");
      const conversationId = await getOrCreateDirectConversation(user.id, memberId);
      navigate(`/messages?conversation=${conversationId}`);
    } catch (error) {
      toast.error("Impossible d'ouvrir la conversation");
    }
  };

  const athleteCoachesBrief = useMemo((): AthleteCoachBrief[] => {
    const m = new Map<string, AthleteCoachBrief>();
    athletePlanSessions.forEach((s) => {
      if (!m.has(s.coachId)) {
        m.set(s.coachId, {
          id: s.coachId,
          name: s.coachName,
          sport: sportLabel(s.sport),
          avatarUrl: s.coachAvatarUrl,
          clubName: s.clubName,
        });
      } else {
        const cur = m.get(s.coachId)!;
        const nextSport = sportLabel(s.sport);
        if (cur.sport !== nextSport) {
          m.set(s.coachId, { ...cur, sport: "Plusieurs sports" });
        }
      }
    });
    return Array.from(m.values());
  }, [athletePlanSessions]);

  const confirmAthleteSession = async (s: AthletePlanSessionModel) => {
    if (!s.participationId) {
      toast.error("Synchronisation en cours. Réessayez dans un instant.");
      return;
    }
    const { error } = await supabase.from("coaching_participations").update({ status: "confirmed" }).eq("id", s.participationId);
    if (error) {
      toast.error("Confirmation impossible", error.message);
      return;
    }
    toast.success("Séance confirmée");
    await loadAthleteWeek({ silent: true });
  };

  const completeAthleteSession = async (s: AthletePlanSessionModel) => {
    if (!s.participationId) {
      toast.error("Synchronisation en cours. Réessayez dans un instant.");
      return;
    }
    const { error } = await supabase
      .from("coaching_participations")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
      })
      .eq("id", s.participationId);
    if (error) {
      toast.error("Mise à jour impossible", error.message);
      return;
    }
    toast.success("Séance enregistrée comme réalisée");
    await loadAthleteWeek({ silent: true });
  };

  const persistAthleteFeedback = async (
    s: AthletePlanSessionModel,
    payload: { note: string; rpe: number | null; felt: "easy" | "ok" | "hard" | null }
  ) => {
    if (!s.participationId) {
      toast.error("Participation introuvable");
      return;
    }
    const { error } = await supabase.from("coaching_participations").update({ athlete_note: payload.note || null }).eq("id", s.participationId);
    if (error) {
      toast.error("Enregistrement impossible", error.message);
      return;
    }
    toast.success("Retour enregistré");
    await loadAthleteWeek({ silent: true });
  };

  const updateMemberRole = async (memberId: string, role: ClubRole) => {
    if (!activeClubId) return;
    const payload = {
      is_admin: role === "admin",
      is_coach: role === "coach" || role === "admin",
    };
    const { error } = await supabase
      .from("group_members")
      .update(payload)
      .eq("conversation_id", activeClubId)
      .eq("user_id", memberId);
    if (error) {
      toast.error("Mise à jour du rôle impossible", error.message);
      return;
    }
    setClubMembers((prev) => prev.map((m) => (m.userId === memberId ? { ...m, role } : m)));
    toast.success("Rôle mis à jour");
  };

  const removeMemberFromClub = async (memberId: string) => {
    if (!activeClubId) return;
    const { error } = await supabase
      .from("group_members")
      .delete()
      .eq("conversation_id", activeClubId)
      .eq("user_id", memberId);
    if (error) {
      toast.error("Suppression impossible", error.message);
      return;
    }
    setClubMembers((prev) => prev.filter((m) => m.userId !== memberId));
    toast.success("Membre retiré du club");
  };

  const editClubInfo = async () => {
    if (!activeClubId) return;
    const nextName = window.prompt("Nom du club", activeClubName || "RunConnect Club");
    if (!nextName?.trim()) return;
    const nextLocation = window.prompt("Ville / localisation", clubLocation || "") || null;
    const { error } = await supabase
      .from("conversations")
      .update({ group_name: nextName.trim(), location: nextLocation })
      .eq("id", activeClubId);
    if (error) {
      toast.error("Modification impossible", error.message);
      return;
    }
    setClubs((prev) => prev.map((club) => (club.id === activeClubId ? { ...club, name: nextName.trim() } : club)));
    setClubLocation(nextLocation);
    toast.success("Informations du club mises à jour");
  };

  const createGroup = async () => {
    if (!activeClubId) return;
    const name = window.prompt("Nom du groupe", "Nouveau groupe");
    if (!name?.trim()) return;
    const { data, error } = await supabase
      .from("club_groups")
      .insert({ club_id: activeClubId, name: name.trim(), color: "#3B82F6" })
      .select("id, name")
      .single();
    if (error) {
      toast.error("Création du groupe impossible", error.message);
      return;
    }
    setGroups((prev) => [...prev, { id: data.id, name: data.name }]);
    setClubGroupsAdmin((prev) => [...prev, { id: data.id, name: data.name, athletesCount: 0 }]);
    toast.success("Groupe créé");
  };

  const deleteGroup = async (groupId: string) => {
    const { error } = await supabase.from("club_groups").delete().eq("id", groupId);
    if (error) {
      toast.error("Suppression du groupe impossible", error.message);
      return;
    }
    setClubGroupsAdmin((prev) => prev.filter((g) => g.id !== groupId));
    setGroups((prev) => prev.filter((g) => g.id !== groupId));
    toast.success("Groupe supprimé");
  };

  const resendInvitation = async (invitationId: string) => {
    const { error } = await supabase
      .from("club_invitations")
      .update({ status: "pending", updated_at: new Date().toISOString() })
      .eq("id", invitationId);
    if (error) {
      toast.error("Renvoi impossible", error.message);
      return;
    }
    setClubInvitations((prev) => prev.map((inv) => (inv.id === invitationId ? { ...inv, status: "pending" } : inv)));
    toast.success("Invitation renvoyée");
  };

  const cancelInvitation = async (invitationId: string) => {
    const { error } = await supabase.from("club_invitations").delete().eq("id", invitationId);
    if (error) {
      toast.error("Annulation impossible", error.message);
      return;
    }
    setClubInvitations((prev) => prev.filter((inv) => inv.id !== invitationId));
    toast.success("Invitation annulée");
  };

  const openOrCreateGroupConversation = async (group: {
    id: string;
    name: string;
    avatarUrl: string | null;
    memberIds: string[];
  }) => {
    if (!user || !activeClubId) return;
    const locationMarker = `club-group:${group.id}`;
    try {
      let conversationId: string | null = null;
      const { data: existing } = await supabase
        .from("conversations")
        .select("id")
        .eq("is_group", true)
        .eq("location", locationMarker)
        .maybeSingle();
      if (existing?.id) {
        conversationId = existing.id;
        await supabase
          .from("conversations")
          .update({
            group_name: group.name,
            group_avatar_url: group.avatarUrl,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id);
      } else {
        const { data: created, error: createError } = await supabase
          .from("conversations")
          .insert({
            is_group: true,
            group_name: group.name,
            group_avatar_url: group.avatarUrl,
            created_by: user.id,
            participant_1: user.id,
            participant_2: user.id,
            location: locationMarker,
          })
          .select("id")
          .single();
        if (createError) {
          toast.error("Impossible de créer la conversation groupe", createError.message);
          return;
        }
        conversationId = created.id;
      }
      if (!conversationId) return;

      const targetMemberIds = Array.from(new Set([user.id, ...group.memberIds]));
      const { data: existingMembers } = await supabase
        .from("group_members")
        .select("user_id")
        .eq("conversation_id", conversationId)
        .in("user_id", targetMemberIds);
      const existingSet = new Set((existingMembers || []).map((entry) => entry.user_id));
      const toInsert = targetMemberIds
        .filter((memberId) => !existingSet.has(memberId))
        .map((memberId) => ({
          conversation_id: conversationId!,
          user_id: memberId,
          is_admin: memberId === user.id,
          is_coach: memberId === user.id,
        }));
      if (toInsert.length) {
        const { error: memberInsertError } = await supabase.from("group_members").insert(toInsert);
        if (memberInsertError) {
          toast.error("Impossible d'ajouter tous les membres au groupe", memberInsertError.message);
          return;
        }
      }
      navigate(`/messages?conversation=${conversationId}`);
    } catch (error) {
      toast.error("Erreur lors de l'ouverture du groupe de discussion");
    }
  };

  return (
    <>
      <div className="flex h-full min-h-0 flex-col overflow-hidden bg-secondary" data-tutorial="tutorial-coaching">
        <IosFixedPageHeaderShell
          className="min-h-0 flex-1"
          headerWrapperClassName="shrink-0 border-b border-border bg-card"
          header={
            <PlanningHeader
              onOpenMenu={() => setDrawerOpen(true)}
              title={sectionTitle}
              subtitle={activeMenuKey === "my-plan" ? "Semaine d'entraînement et séances programmées" : undefined}
            />
          }
          scrollClassName="bg-secondary pb-24"
        >
          <div className="space-y-0 pb-6">
            {activeMenuKey === "planning" && clubs.length > 1 && (
              <div className="border-b border-border bg-card">
                <p className="px-4 pt-3 pb-1 text-[11px] uppercase tracking-wider text-muted-foreground">Club</p>
                <div className="divide-y divide-border">
                  {clubs.map((club) => (
                    <button
                      key={club.id}
                      type="button"
                      onClick={() => setActiveClubId(club.id)}
                      className={cn(
                        "w-full px-4 py-3 text-left text-[15px] font-medium transition-colors active:bg-secondary/80",
                        activeClubId === club.id ? "bg-primary text-primary-foreground" : "text-foreground"
                      )}
                    >
                      {club.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {activeMenuKey === "planning" && !effectiveAthleteMode && <PlanningSearchBar value={search} onChange={setSearch} />}

            {activeMenuKey === "planning" && !effectiveAthleteMode && (searchResults.athletes.length > 0 || searchResults.groups.length > 0) && (
              <div className="divide-y divide-border border-b border-border bg-card">
                {searchResults.groups.map((group) => (
                  <button
                    key={group.id}
                    className="flex w-full items-center justify-between px-4 py-3 text-left active:bg-secondary/80"
                    onClick={() => {
                      setActiveGroupId(group.id);
                      setActiveAthleteId(undefined);
                      setSearch("");
                    }}
                  >
                    <span className="text-[15px] font-medium text-foreground">{group.name}</span>
                    <span className="text-[13px] text-muted-foreground">Groupe</span>
                  </button>
                ))}
                {searchResults.athletes.map((athlete) => (
                  <button
                    key={athlete.id}
                    className="flex w-full items-center justify-between px-4 py-3 text-left active:bg-secondary/80"
                    onClick={() => {
                      setActiveAthleteId(athlete.id);
                      setActiveGroupId(undefined);
                      setSearch("");
                    }}
                  >
                    <span className="text-[15px] font-medium text-foreground">{athlete.name}</span>
                    <span className="text-[13px] text-muted-foreground">Athlète</span>
                  </button>
                ))}
              </div>
            )}

            {activeMenuKey === "my-plan" ? (
              <AthleteMyPlanView
                loading={athletePlanLoading}
                weekDays={weekDays}
                weekStart={weekAnchor}
                selectedDate={selectedDate}
                onSelectDate={setSelectedDate}
                onPreviousWeek={() => setWeekAnchor((current) => subWeeks(current, 1))}
                onNextWeek={() => setWeekAnchor((current) => addWeeks(current, 1))}
                sessions={athletePlanSessions}
                prevWeekPlannedKm={prevWeekAthleteKm}
                coaches={athleteCoachesBrief}
                onConfirmSession={confirmAthleteSession}
                onCompleteSession={completeAthleteSession}
                onMessageCoach={(id) => void openDirectMessage(id)}
                onPersistSessionFeedback={persistAthleteFeedback}
                onOpenCoaches={() => document.getElementById("athlete-coaches-block")?.scrollIntoView({ behavior: "smooth" })}
                onOpenMessages={() => navigate("/messages")}
                onOpenPastSessions={() => setWeekAnchor(startOfWeek(subWeeks(new Date(), 3), { weekStartsOn: 1 }))}
                onOpenCalendar={() => toast.info("Vue calendrier complet", "Cette navigation arrive bientôt.")}
                navigateProfile={(userId) => navigate(`/profile/${userId}`)}
              />
            ) : activeMenuKey === "planning" ? (
              <>
                <WeekSelectorPremium
                  weekStart={weekAnchor}
                  selectedDate={selectedDate}
                  onSelectDate={setSelectedDate}
                  onPreviousWeek={() => setWeekAnchor((current) => subWeeks(current, 1))}
                  onNextWeek={() => setWeekAnchor((current) => addWeeks(current, 1))}
                  indicatorsByDate={dayIndicatorsByDate}
                />

                <div className="flex flex-col border-t border-border">
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
                    onSend={
                      session
                        ? () => void (session.sent ? unsendSession(session.id) : sendSession(session.id))
                        : undefined
                    }
                    onDuplicate={session ? () => void duplicateSession(session, addDays(day, 1)) : undefined}
                    onDelete={session ? () => void removeSession(session.id) : undefined}
                    onUnsend={session ? () => void unsendSession(session.id) : undefined}
                    allowSessionActions={!effectiveAthleteMode}
                  />
                );
                  })}
                </div>
                {!effectiveAthleteMode && (
                  <div className="border-t border-border bg-card px-4 py-3">
                    <div className="grid grid-cols-2 gap-2">
                      <Button type="button" variant="secondary" className="h-10 rounded-xl" onClick={() => copyAthleteWeek()}>
                        Copier la semaine
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        className="h-10 rounded-xl"
                        onClick={() => void pasteAthleteWeek()}
                        disabled={!copiedWeekSessions?.length || copiedFromAthleteId === activeAthleteId}
                      >
                        Coller la semaine
                      </Button>
                    </div>
                  </div>
                )}
              </>
            ) : activeMenuKey === "dashboard" ? (
              activeClubId ? (
                <CoachDashboardPage
                  clubId={activeClubId}
                  onOpenLateAthletes={() => {
                    setActiveMenuKey("tracking");
                    setTrackingSelectedAthleteId(null);
                  }}
                  onOpenMessages={() => navigate("/messages")}
                  onOpenPlanning={() => {
                    setActiveMenuKey("planning");
                    setCoachingTab("planning");
                  }}
                  onOpenTemplates={() => {
                    setActiveMenuKey("templates");
                    setCoachingTab("planning");
                  }}
                />
              ) : (
                <div className="border-b border-border bg-secondary/30 px-4 py-6">
                  <p className="text-[16px] font-semibold text-foreground">Tableau de bord</p>
                  <p className="mt-1 text-[13px] text-muted-foreground">Sélectionnez un club pour afficher le dashboard.</p>
                </div>
              )
            ) : activeMenuKey === "tracking" ? (
              activeClubId ? (
                <WeeklyTrackingView
                  clubId={activeClubId}
                  onClose={() => undefined}
                  selectedAthleteId={trackingSelectedAthleteId}
                  onSelectAthlete={setTrackingSelectedAthleteId}
                />
              ) : (
                <div className="border-b border-border bg-secondary/30 px-4 py-6">
                  <p className="text-[16px] font-semibold text-foreground">Suivi athlète</p>
                  <p className="mt-1 text-[13px] text-muted-foreground">Sélectionnez un club pour afficher le suivi.</p>
                </div>
              )
            ) : activeMenuKey === "templates" ? (
              <ModelsPage
                weekDays={weekDays}
                existingSessionsByDay={existingSessionsByDay}
                myModels={myModels}
                baseModels={BASE_MODELS}
                onCreateModel={() => void createModelFromDraft()}
                onAddToPlanning={(model, day, replaceExisting) => void addModelToPlanning(model, day, replaceExisting)}
                onEditModel={editModel}
                onDuplicateModel={(model) => void duplicateModel(model)}
                onDeleteModel={(model) => void deleteModel(model)}
              />
            ) : activeMenuKey === "groups" ? (
              activeClubId ? (
                <div className="border-b border-border bg-card">
                  <ClubGroupsManager
                    clubId={activeClubId}
                    onMessageGroup={(group) => void openOrCreateGroupConversation(group)}
                  />
                </div>
              ) : (
                <div className="border-b border-border bg-secondary/30 px-4 py-6">
                  <p className="text-[16px] font-semibold text-foreground">Groupes</p>
                  <p className="mt-1 text-[13px] text-muted-foreground">Sélectionnez un club pour afficher les groupes.</p>
                </div>
              )
            ) : activeMenuKey === "club" ? (
              <ClubManagementPage
                clubName={activeClubName || "RunConnect Club"}
                clubLocation={clubLocation}
                clubAvatarUrl={clubAvatarUrl}
                athletesCount={clubMembers.filter((m) => m.role === "athlete").length}
                coachesCount={clubMembers.filter((m) => m.role === "coach" || m.role === "admin").length}
                groupsCount={clubGroupsAdmin.length}
                plannedSessionsCount={plannedSessionsCount}
                validatedSessionsCount={validatedSessionsCount}
                members={clubMembers}
                groups={clubGroupsAdmin}
                invitations={clubInvitations}
                onInviteAthlete={() => setInviteDialogOpen(true)}
                onInviteCoach={() => setInviteDialogOpen(true)}
                onCreateGroup={() => void createGroup()}
                onEditClub={() => void editClubInfo()}
                onViewGroups={() => setActiveMenuKey("groups")}
                onOpenMemberProfile={(userId) => navigate(`/profile/${userId}`)}
                onSendMessage={(userId) => void openDirectMessage(userId)}
                onChangeRole={(userId, role) => void updateMemberRole(userId, role)}
                onRemoveMember={(userId) => void removeMemberFromClub(userId)}
                onOpenGroup={() => setActiveMenuKey("groups")}
                onEditGroup={() => setActiveMenuKey("groups")}
                onDeleteGroup={(groupId) => void deleteGroup(groupId)}
                onAssignMembers={() => setActiveMenuKey("groups")}
                onResendInvitation={(invitationId) => void resendInvitation(invitationId)}
                onCancelInvitation={(invitationId) => void cancelInvitation(invitationId)}
              />
            ) : (
              <div className="border-b border-border bg-secondary/30 px-4 py-6">
                <p className="text-[16px] font-semibold text-foreground">
                  {(activeMenuKey as string) === "dashboard" && "Tableau de bord coach"}
                  {activeMenuKey === "athletes" && "Athlètes"}
                  {(activeMenuKey as string) === "groups" && "Groupes"}
                  {(activeMenuKey as string) === "tracking" && "Suivi athlète"}
                  {activeMenuKey === "library" && "Bibliothèque de séances"}
                  {(activeMenuKey as string) === "templates" && "Modèles"}
                  {(activeMenuKey as string) === "club" && "Gérer le club"}
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
        clubAvatarUrl={clubAvatarUrl}
        userMode={effectiveAthleteMode ? "athlete" : "coach"}
        otherClubsCount={Math.max(clubs.length - 1, 0)}
        onPressClubSwitcher={rotateActiveClub}
      />

      <AlertDialog open={showCoachRequiredDialog} onOpenChange={setShowCoachRequiredDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Vous n'êtes pas coach dans ce club</AlertDialogTitle>
            <AlertDialogDescription>
              Cette section est réservée aux coachs. Créez votre propre club pour devenir coach et accéder à la planification, au suivi et aux groupes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Plus tard</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowCoachRequiredDialog(false);
                navigate("/messages?createClub=1");
              }}
            >
              Créer un club
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <InviteMembersDialog
        open={inviteDialogOpen}
        onOpenChange={setInviteDialogOpen}
        clubId={activeClubId || undefined}
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
                      className="inline-flex items-center gap-1 text-[16px] font-medium text-primary"
                      onClick={() => setCoachingTab("planning")}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Retour
                    </button>
                  }
                  title="Créer une séance"
                  right={
                    editorTab === "build" ? (
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
                    ) : (
                      <span className="inline-block w-14" aria-hidden />
                    )
                  }
                />
                <div className="grid grid-cols-2 gap-2 px-4 pb-2">
                  <button
                    type="button"
                    onClick={() => setEditorTab("build")}
                    className={cn(
                      "rounded-xl py-2 text-center text-[13px] font-semibold transition-colors",
                      editorTab === "build" ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"
                    )}
                  >
                    Construire
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditorTab("models")}
                    className={cn(
                      "rounded-xl py-2 text-center text-[13px] font-semibold transition-colors",
                      editorTab === "models" ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"
                    )}
                  >
                    Modèles
                  </button>
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
              <ModelsPage
                weekDays={weekDays}
                existingSessionsByDay={existingSessionsByDay}
                myModels={myModels}
                baseModels={BASE_MODELS}
                onCreateModel={() => void createModelFromDraft()}
                onAddToPlanning={async (model, day, replaceExisting) => {
                  const ok = await addModelToPlanning(model, day, replaceExisting);
                  if (ok) setCoachingTab("planning");
                }}
                onEditModel={(model) => {
                  editModel(model);
                }}
                onDuplicateModel={(model) => void duplicateModel(model)}
                onDeleteModel={(model) => void deleteModel(model)}
              />
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
                    onClick={() => {
                      const total = blockForm.durationSec || 0;
                      setWheelA(String(Math.floor(total / 3600)));
                      setWheelB(String(Math.floor((total % 3600) / 60)));
                      setWheelC(String(total % 60));
                      openWheelColumns(
                        "Durée",
                        [
                          { items: Array.from({ length: 11 }, (_, i) => ({ value: String(i), label: String(i) })), value: wheelA, onChange: setWheelA, suffix: "h" },
                          { items: Array.from({ length: 60 }, (_, i) => ({ value: String(i), label: String(i).padStart(2, "0") })), value: wheelB, onChange: setWheelB, suffix: "m" },
                          { items: Array.from({ length: 60 }, (_, i) => ({ value: String(i), label: String(i).padStart(2, "0") })), value: wheelC, onChange: setWheelC, suffix: "s" },
                        ],
                        () => {
                          const next = Number.parseInt(wheelA, 10) * 3600 + Number.parseInt(wheelB, 10) * 60 + Number.parseInt(wheelC, 10);
                          setBlockForm((prev) => {
                            if (!prev) return prev;
                            const computedPace =
                              prev.distanceM && prev.distanceM > 0 ? Math.round((next / prev.distanceM) * 1000) : prev.paceSecPerKm;
                            return { ...prev, durationSec: next, paceSecPerKm: computedPace };
                          });
                        }
                      );
                    }}
                  >
                    Durée: {secondsToLabel(blockForm.durationSec) || "Non définie"}
                  </Button>
                  <Button
                    variant="secondary"
                    className="h-10 justify-start rounded-xl text-[13px]"
                    onClick={() => {
                      const meters = blockForm.distanceM || 0;
                      setWheelA(String(Math.max(0, Math.round(meters))));
                      openWheelColumns(
                        "Distance",
                        [
                          {
                            items: Array.from({ length: 1001 }, (_, i) => {
                              const value = i * 10;
                              return { value: String(value), label: value.toLocaleString("fr-FR") };
                            }),
                            value: wheelA,
                            onChange: setWheelA,
                            suffix: "m",
                          },
                        ],
                        () => {
                          const next = Number.parseInt(wheelA, 10);
                          setBlockForm((prev) => {
                            if (!prev) return prev;
                            const nextDistance = Number.isFinite(next) ? next : 0;
                            const computedPace =
                              prev.durationSec && nextDistance > 0 ? Math.round((prev.durationSec / nextDistance) * 1000) : prev.paceSecPerKm;
                            return { ...prev, distanceM: nextDistance, paceSecPerKm: computedPace };
                          });
                        }
                      );
                    }}
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
                      onClick={() => {
                        const total = blockForm.recoveryDurationSec || 0;
                        setWheelA(String(Math.floor(total / 3600)));
                        setWheelB(String(Math.floor((total % 3600) / 60)));
                        setWheelC(String(total % 60));
                        openWheelColumns(
                          "Récupération",
                          [
                            { items: Array.from({ length: 11 }, (_, i) => ({ value: String(i), label: String(i) })), value: wheelA, onChange: setWheelA, suffix: "h" },
                            { items: Array.from({ length: 60 }, (_, i) => ({ value: String(i), label: String(i).padStart(2, "0") })), value: wheelB, onChange: setWheelB, suffix: "m" },
                            { items: Array.from({ length: 60 }, (_, i) => ({ value: String(i), label: String(i).padStart(2, "0") })), value: wheelC, onChange: setWheelC, suffix: "s" },
                          ],
                          () => {
                            const next = Number.parseInt(wheelA, 10) * 3600 + Number.parseInt(wheelB, 10) * 60 + Number.parseInt(wheelC, 10);
                            setBlockForm((prev) => (prev ? { ...prev, recoveryDurationSec: next } : prev));
                          }
                        );
                      }}
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
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="secondary"
                      className="h-10 justify-start rounded-xl text-[12px]"
                      onClick={() => {
                        const derivedPace =
                          blockForm.durationSec && blockForm.distanceM && blockForm.distanceM > 0
                            ? Math.round((blockForm.durationSec / blockForm.distanceM) * 1000)
                            : undefined;
                        setWheelUnit("min/km");
                        const pace = blockForm.paceSecPerKm || derivedPace || 330;
                        setWheelA(String(Math.floor(pace / 60)));
                        setWheelB(String(pace % 60));
                        openWheelColumns(
                          "Allure",
                          [
                            { items: Array.from({ length: 60 }, (_, i) => ({ value: String(i), label: String(i).padStart(2, "0") })), value: wheelA, onChange: setWheelA, suffix: "'" },
                            { items: Array.from({ length: 60 }, (_, i) => ({ value: String(i), label: String(i).padStart(2, "0") })), value: wheelB, onChange: setWheelB, suffix: "''" },
                            { items: [{ value: "min/km", label: "/km" }, { value: "min/mi", label: "/mi" }, { value: "s/100", label: "/100m" }], value: wheelUnit, onChange: setWheelUnit },
                          ],
                          () => {
                            const unit = wheelUnit;
                            if (unit === "s/100") {
                              const sec100 = Number.parseInt(wheelA, 10);
                              const pacePerKm = sec100 * 10;
                              setBlockForm((prev) => (prev ? { ...prev, paceSecPerKm: pacePerKm, powerWatts: undefined } : prev));
                              return;
                            }
                            const secBase = Number.parseInt(wheelA, 10) * 60 + Number.parseInt(wheelB, 10);
                            const pacePerKm = unit === "min/mi" ? Math.round(secBase / 1.609344) : secBase;
                            setBlockForm((prev) => (prev ? { ...prev, paceSecPerKm: pacePerKm, powerWatts: undefined } : prev));
                          }
                        );
                      }}
                    >
                      {paceToLabel(
                        blockForm.paceSecPerKm ||
                          (blockForm.durationSec && blockForm.distanceM && blockForm.distanceM > 0
                            ? Math.round((blockForm.durationSec / blockForm.distanceM) * 1000)
                            : undefined)
                      ) || "Allure"}
                    </Button>
                    {draft.sport === "cycling" ? (
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
                                prev ? { ...prev, powerWatts: Number(next), paceSecPerKm: undefined } : prev
                              )
                          )
                        }
                      >
                        {blockForm.powerWatts ? `${blockForm.powerWatts} W` : "Puissance"}
                      </Button>
                    ) : null}
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
        columns={wheelColumns}
        onConfirm={() => {
          applyWheel?.();
          setWheelOpen(false);
        }}
      />
    </>
  );
}

