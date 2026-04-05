import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, BookOpen, Trophy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ProfilePreviewDialog } from "@/components/ProfilePreviewDialog";
import { useProfileNavigation } from "@/hooks/useProfileNavigation";
import { LeaderboardSkeleton } from "@/components/ui/skeleton-loader";
import { RulesSheet } from "@/components/leaderboard/RulesSheet";
import { cn } from "@/lib/utils";

type PointsMode = "season" | "total";

interface LeaderboardUser {
  user_id: string;
  total_points: number;
  weekly_points: number;
  seasonal_points: number;
  profile: {
    username: string;
    display_name: string;
    avatar_url: string;
    is_premium?: boolean;
  };
  rank: number;
  user_rank: string;
}

interface MySnapshot {
  rank: number;
  username: string;
  display_name: string;
  avatar_url: string | null;
  points: number;
}

const USERS_PER_PAGE = 20;
const META_LIMIT = 10000;

const orderColumn = (m: PointsMode): "seasonal_points" | "total_points" =>
  m === "season" ? "seasonal_points" : "total_points";

const pointsForMode = (u: LeaderboardUser, m: PointsMode) =>
  m === "season" ? u.seasonal_points : u.total_points;

const getUserRank = (points: number): string => {
  if (points >= 5000) return "diamant";
  if (points >= 3000) return "platine";
  if (points >= 2000) return "or";
  if (points >= 1000) return "argent";
  if (points >= 500) return "bronze";
  return "novice";
};

function looksLikeEmail(s: string): boolean {
  const t = s.trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t);
}

/** Titre principal : jamais un email ; préfère display_name propre sinon username */
function leaderboardPrimaryName(profile: { display_name?: string | null; username?: string | null }): string {
  const un = (profile.username?.trim() || "?").slice(0, 200);
  const dn = profile.display_name?.trim();
  if (!dn) return un;
  if (looksLikeEmail(dn)) return un;
  return dn;
}

const getRankRing = (rank: string) => {
  switch (rank) {
    case "diamant":
      return "ring-[1.5px] ring-cyan-400/90";
    case "platine":
      return "ring-[1.5px] ring-purple-500/85";
    case "or":
      return "ring-[1.5px] ring-amber-400/90";
    case "argent":
      return "ring-[1.5px] ring-slate-400/90";
    case "bronze":
      return "ring-[1.5px] ring-amber-700/70";
    default:
      return "ring-1 ring-border/80";
  }
};

function PodiumBlock({
  rank,
  user,
  pointsMode,
  onProfile,
}: {
  rank: 1 | 2 | 3;
  user: LeaderboardUser | undefined;
  pointsMode: PointsMode;
  onProfile: () => void;
}) {
  const empty = !user;
  const pts = user ? pointsForMode(user, pointsMode) : 0;
  const primary = user ? leaderboardPrimaryName(user.profile) : "—";

  const avatarClass =
    rank === 1 ? "h-[4.5rem] w-[4.5rem] sm:h-[5rem] sm:w-[5rem]" : "h-[3.25rem] w-[3.25rem] sm:h-14 sm:w-14";
  const pedestalH = rank === 1 ? "h-[4.25rem] sm:h-20" : "h-[2.75rem] sm:h-12";

  const tone =
    rank === 1
      ? {
          ring: "ring-2 ring-amber-200/90 dark:ring-amber-500/35",
          badge: "border border-amber-200/80 bg-amber-50 text-amber-900 shadow-sm dark:border-amber-500/30 dark:bg-amber-950/50 dark:text-amber-100",
          pedestal:
            "bg-gradient-to-b from-amber-100/95 via-amber-50/80 to-amber-100/40 shadow-[inset_0_1px_0_rgba(255,255,255,0.5)] dark:from-amber-950/50 dark:via-amber-950/25 dark:to-amber-950/40",
          glow: "shadow-[0_12px_40px_-12px_rgba(217,119,6,0.35)]",
        }
      : rank === 2
        ? {
            ring: "ring-2 ring-slate-200/95 dark:ring-slate-500/35",
            badge: "border border-slate-200/90 bg-slate-50 text-slate-800 shadow-sm dark:border-slate-600/50 dark:bg-slate-900/60 dark:text-slate-100",
            pedestal:
              "bg-gradient-to-b from-slate-100/95 via-slate-50/75 to-slate-200/35 shadow-[inset_0_1px_0_rgba(255,255,255,0.45)] dark:from-slate-800/55 dark:via-slate-900/35 dark:to-slate-950/50",
            glow: "shadow-[0_8px_28px_-10px_rgba(100,116,139,0.35)]",
          }
        : {
            ring: "ring-2 ring-orange-200/90 dark:ring-orange-600/35",
            badge: "border border-orange-200/80 bg-orange-50 text-orange-950 shadow-sm dark:border-orange-700/40 dark:bg-orange-950/45 dark:text-orange-100",
            pedestal:
              "bg-gradient-to-b from-orange-100/90 via-amber-50/70 to-orange-100/35 shadow-[inset_0_1px_0_rgba(255,255,255,0.4)] dark:from-orange-950/45 dark:via-orange-950/20 dark:to-orange-950/40",
            glow: "shadow-[0_8px_28px_-10px_rgba(234,88,12,0.28)]",
          };

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.38, delay: rank === 1 ? 0.06 : rank === 2 ? 0 : 0.12 }}
      className={cn(
        "flex min-w-0 flex-1 flex-col items-stretch justify-end",
        rank === 1 ? "max-w-[38%] sm:max-w-[9.5rem]" : "max-w-[31%] sm:max-w-[7.5rem]"
      )}
    >
      <button
        type="button"
        disabled={empty}
        onClick={onProfile}
        className={cn(
          "group flex min-w-0 flex-col items-center rounded-2xl px-0.5 pb-1 pt-2 transition-opacity",
          empty ? "cursor-default opacity-45" : "active:opacity-90"
        )}
      >
        <div className={cn("relative mb-2 flex justify-center", tone.glow)}>
          <div
            className={cn(
              "relative rounded-full bg-gradient-to-b p-[2px] shadow-sm",
              rank === 1 ? "from-amber-200/60 to-amber-400/30" : rank === 2 ? "from-slate-200/70 to-slate-400/25" : "from-orange-200/60 to-orange-400/28"
            )}
          >
            <Avatar className={cn(avatarClass, "border-2 border-background", tone.ring)}>
              <AvatarImage src={user?.profile?.avatar_url} className="object-cover" />
              <AvatarFallback className="bg-secondary text-sm font-semibold">
                {user?.profile?.username?.[0]?.toUpperCase() || "—"}
              </AvatarFallback>
            </Avatar>
          </div>
          <span
            className={cn(
              "absolute -bottom-0.5 left-1/2 flex h-6 min-w-[1.5rem] -translate-x-1/2 items-center justify-center rounded-full px-1.5 text-[11px] font-bold tabular-nums",
              tone.badge
            )}
          >
            {rank}
          </span>
        </div>

        <div className="flex w-full min-w-0 flex-col items-center gap-0.5 px-0.5">
          <p
            className="w-full min-w-0 max-w-full truncate text-center text-[13px] font-semibold leading-tight text-foreground sm:text-[14px]"
            title={empty ? undefined : primary}
          >
            {empty ? "—" : primary}
          </p>
          {!empty && user.profile?.username ? (
            <p
              className="w-full min-w-0 max-w-full truncate text-center text-[11px] font-medium leading-tight text-muted-foreground"
              title={`@${user.profile.username}`}
            >
              @{user.profile.username}
            </p>
          ) : null}
          <p className="mt-0.5 truncate text-center text-[15px] font-bold tabular-nums tracking-tight text-primary sm:text-[16px]">
            {empty ? "—" : pts.toLocaleString()}
            {!empty ? <span className="ml-1 text-[11px] font-semibold text-muted-foreground">pts</span> : null}
          </p>
        </div>
      </button>

      <div className="mt-3 flex w-full min-w-0 flex-col items-center">
        <div
          className={cn(
            "w-full min-w-0 rounded-t-[10px] border-x border-t border-black/[0.06] dark:border-white/[0.08]",
            pedestalH,
            tone.pedestal
          )}
        />
      </div>
    </motion.div>
  );
}

function LeaderboardListRow({
  u,
  isMe,
  pointsMode,
  onClick,
}: {
  u: LeaderboardUser;
  isMe: boolean;
  pointsMode: PointsMode;
  onClick: () => void;
}) {
  const pts = pointsForMode(u, pointsMode);
  const primary = leaderboardPrimaryName(u.profile);
  const un = u.profile?.username?.trim() || "";

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full min-w-0 items-center gap-3 rounded-[13px] border border-border/55 bg-card px-3 py-2.5 text-left shadow-[var(--shadow-card)] transition-colors active:bg-secondary/60",
        isMe && "border-primary/25 bg-primary/[0.06] ring-1 ring-primary/20"
      )}
    >
      <span className="w-9 shrink-0 text-center text-[13px] font-bold tabular-nums text-muted-foreground">
        {u.rank}
      </span>
      <Avatar className={cn("h-11 w-11 shrink-0", getRankRing(u.user_rank))}>
        <AvatarImage src={u.profile?.avatar_url} className="object-cover" />
        <AvatarFallback className="bg-secondary text-xs font-bold">
          {u.profile?.username?.[0]?.toUpperCase() || "?"}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1 overflow-hidden">
        <p
          className={cn(
            "min-w-0 truncate text-[15px] font-semibold leading-snug text-foreground",
            isMe && "text-primary"
          )}
          title={primary}
        >
          {primary}
        </p>
        {un ? (
          <p className="min-w-0 truncate text-[12px] leading-snug text-muted-foreground" title={`@${un}`}>
            @{un}
          </p>
        ) : null}
      </div>
      <div className="min-w-0 shrink-0 text-right">
        <p className="text-[15px] font-bold tabular-nums text-foreground">{pts.toLocaleString()}</p>
        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">pts</p>
      </div>
    </button>
  );
}

const Leaderboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [pointsMode, setPointsMode] = useState<PointsMode>("season");
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [hasMoreUsers, setHasMoreUsers] = useState(true);
  const [mySnapshot, setMySnapshot] = useState<MySnapshot | null>(null);
  const [meRowInView, setMeRowInView] = useState(false);
  const [showRules, setShowRules] = useState(false);

  const listScrollRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const meRowRef = useRef<HTMLDivElement>(null);

  const { selectedUserId, showProfilePreview, navigateToProfile, closeProfilePreview } = useProfileNavigation();

  const mapRow = useCallback(
    (item: any, indexInPage: number, page: number): LeaderboardUser => {
      const offset = (page - 1) * USERS_PER_PAGE;
      const rank = offset + indexInPage + 1;
      const pts = pointsMode === "season" ? item.seasonal_points : item.total_points;
      return {
        user_id: item.user_id,
        total_points: item.total_points,
        weekly_points: item.weekly_points,
        seasonal_points: item.seasonal_points,
        profile: {
          username: item.username,
          display_name: item.display_name,
          avatar_url: item.avatar_url,
          is_premium: item.is_premium,
        },
        rank,
        user_rank: getUserRank(pts),
      };
    },
    [pointsMode]
  );

  const fetchMeta = useCallback(async () => {
    if (!user) return;
    const col = orderColumn(pointsMode);
    const { data, error } = await supabase.rpc("get_complete_leaderboard", {
      limit_count: META_LIMIT,
      offset_count: 0,
      order_by_column: col,
    });
    if (error) {
      console.error("Leaderboard meta:", error);
      setTotalUsers(0);
      setMySnapshot(null);
      return;
    }
    const rows = data ?? [];
    setTotalUsers(rows.length);
    const idx = rows.findIndex((r: { user_id: string }) => r.user_id === user.id);
    if (idx >= 0) {
      const row = rows[idx] as {
        username: string;
        display_name: string;
        avatar_url: string;
        seasonal_points: number;
        total_points: number;
      };
      setMySnapshot({
        rank: idx + 1,
        username: row.username,
        display_name: row.display_name,
        avatar_url: row.avatar_url,
        points: pointsMode === "season" ? row.seasonal_points : row.total_points,
      });
    } else {
      setMySnapshot(null);
    }
  }, [user, pointsMode]);

  const fetchLeaderboard = async (page: number) => {
    if (page === 1) setLoading(true);
    else setLoadingMore(true);

    try {
      const offset = (page - 1) * USERS_PER_PAGE;
      const { data, error } = await supabase.rpc("get_complete_leaderboard", {
        limit_count: USERS_PER_PAGE,
        offset_count: offset,
        order_by_column: orderColumn(pointsMode),
      });
      if (error) throw error;
      const pageRows = data || [];
      const formatted = pageRows.map((item: any, i: number) => mapRow(item, i, page));

      if (page === 1) setLeaderboard(formatted);
      else setLeaderboard((prev) => [...prev, ...formatted]);

      setHasMoreUsers(pageRows.length === USERS_PER_PAGE);
    } catch (e) {
      console.error("Error fetching leaderboard:", e);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    setCurrentPage(1);
    setLeaderboard([]);
    setMeRowInView(false);
    void fetchMeta();
    void fetchLeaderboard(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional reset on mode/user
  }, [user, pointsMode]);

  useEffect(() => {
    if (!user || currentPage <= 1) return;
    void fetchLeaderboard(currentPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage]);

  const topThree = leaderboard.filter((u) => u.rank <= 3);
  const u1 = topThree.find((u) => u.rank === 1);
  const u2 = topThree.find((u) => u.rank === 2);
  const u3 = topThree.find((u) => u.rank === 3);
  const listFromRank4 = leaderboard.filter((u) => u.rank > 3);

  const hideBottomMe =
    (mySnapshot !== null && mySnapshot.rank <= 3) || (mySnapshot !== null && mySnapshot.rank > 3 && meRowInView);

  useEffect(() => {
    const root = listScrollRef.current;
    const el = meRowRef.current;
    if (!root || !el || !user || !mySnapshot || mySnapshot.rank <= 3) {
      setMeRowInView(false);
      return;
    }
    const obs = new IntersectionObserver(
      ([entry]) => {
        setMeRowInView(entry.isIntersecting);
      },
      { root, threshold: 0.2, rootMargin: "-8px 0px -64px 0px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [user, mySnapshot, listFromRank4.length, leaderboard.length]);

  useEffect(() => {
    const el = sentinelRef.current;
    const root = listScrollRef.current;
    if (!el || !root || !hasMoreUsers || loading || loadingMore) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setCurrentPage((p) => p + 1);
      },
      { root, threshold: 0.1, rootMargin: "100px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMoreUsers, loading, loadingMore, listFromRank4.length]);

  const modeLabels: Record<PointsMode, string> = {
    season: "Saison",
    total: "Total",
  };

  const listBody =
    loading && leaderboard.length === 0 ? (
      <div className="px-0.5 py-2">
        <LeaderboardSkeleton />
      </div>
    ) : leaderboard.length === 0 ? (
      <div className="flex flex-col items-center px-6 py-14 text-center">
        <Trophy className="mb-3 h-11 w-11 text-muted-foreground/45" />
        <p className="text-ios-headline font-semibold text-foreground">Aucun participant</p>
        <p className="mt-1.5 max-w-xs text-ios-subheadline text-muted-foreground">
          Reviens plus tard pour voir le classement.
        </p>
      </div>
    ) : (
      <div className="flex flex-col gap-2.5 px-0.5 pb-3">
        {listFromRank4.map((u) => {
          const isMe = u.user_id === user?.id;
          return (
            <div key={u.user_id} ref={isMe ? meRowRef : undefined}>
              <LeaderboardListRow
                u={u}
                isMe={isMe}
                pointsMode={pointsMode}
                onClick={() => navigateToProfile(u.user_id)}
              />
            </div>
          );
        })}
        {hasMoreUsers && (
          <div ref={sentinelRef} className="flex justify-center py-6">
            {loadingMore && (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            )}
          </div>
        )}
      </div>
    );

  return (
    <div className="fixed-fill-with-bottom-nav flex min-h-0 flex-col bg-secondary">
      <header className="z-20 shrink-0 border-b border-border/80 bg-card/95 pt-[var(--safe-area-top)] backdrop-blur-md supports-[backdrop-filter]:bg-card/90">
        <div className="relative flex min-h-[52px] items-center px-4 pb-2 pt-2">
          <button
            type="button"
            onClick={() => navigate("/")}
            className="z-10 flex min-w-0 shrink-0 items-center gap-1 text-primary"
          >
            <ArrowLeft className="h-5 w-5 shrink-0" />
            <span className="min-w-0 truncate text-[15px] font-medium">Retour</span>
          </button>
          <h1 className="pointer-events-none absolute inset-x-12 top-1/2 min-w-0 -translate-y-1/2 truncate text-center text-[17px] font-semibold tracking-tight text-foreground">
            Classement
          </h1>
          <button
            type="button"
            onClick={() => setShowRules(true)}
            className="z-10 ml-auto flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] border border-border/70 bg-secondary/50 text-primary shadow-sm active:bg-secondary"
            aria-label="Règles du classement"
          >
            <BookOpen className="h-4 w-4" />
          </button>
        </div>

        <div className="px-4 pb-2" data-tutorial="tutorial-leaderboard">
          <div className="mx-auto flex max-w-sm rounded-full border border-border/50 bg-muted/40 p-1 shadow-inner dark:bg-muted/25">
            {(["season", "total"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setPointsMode(m)}
                className={cn(
                  "min-w-0 flex-1 rounded-full px-4 py-2 text-[14px] font-semibold tracking-tight transition-all",
                  pointsMode === m
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground active:bg-background/60"
                )}
              >
                {modeLabels[m]}
              </button>
            ))}
          </div>
        </div>

        <p className="px-4 pb-3 text-center text-[12px] font-medium text-muted-foreground">
          {totalUsers.toLocaleString()} participant{totalUsers !== 1 ? "s" : ""}
        </p>
      </header>

      <div className="shrink-0 border-b border-border/50 bg-secondary px-3 pb-4 pt-2">
        <div className="mx-auto w-full max-w-md rounded-[1.35rem] border border-border/45 bg-muted/25 px-3 pb-3 pt-4 shadow-[var(--shadow-card)] dark:bg-muted/15">
          <p className="mb-4 text-center text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Podium
          </p>
          <div className="flex min-w-0 items-end justify-center gap-1.5 sm:gap-3">
            <PodiumBlock rank={2} user={u2} pointsMode={pointsMode} onProfile={() => u2 && navigateToProfile(u2.user_id)} />
            <PodiumBlock rank={1} user={u1} pointsMode={pointsMode} onProfile={() => u1 && navigateToProfile(u1.user_id)} />
            <PodiumBlock rank={3} user={u3} pointsMode={pointsMode} onProfile={() => u3 && navigateToProfile(u3.user_id)} />
          </div>
        </div>
      </div>

      <div
        ref={listScrollRef}
        className={cn(
          "min-h-0 flex-1 overflow-y-auto overscroll-y-contain [-webkit-overflow-scrolling:touch] px-3 pt-4",
          hideBottomMe || !mySnapshot ? "pb-4" : "pb-2"
        )}
      >
        <motion.div
          className="mx-auto w-full max-w-lg"
          initial={{ opacity: 0.92, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        >
          {listBody}
        </motion.div>
      </div>

      {mySnapshot && !hideBottomMe ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="shrink-0 border-t border-border/80 bg-card/95 px-4 py-2.5 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-6px_28px_-10px_rgba(0,0,0,0.1)] backdrop-blur-md supports-[backdrop-filter]:bg-card/88"
        >
          <div className="mx-auto flex min-w-0 max-w-lg items-center gap-3">
            <span className="w-9 shrink-0 text-center text-[13px] font-bold tabular-nums text-primary">#{mySnapshot.rank}</span>
            <Avatar className="h-10 w-10 shrink-0 ring-1 ring-border/80">
              <AvatarImage src={mySnapshot.avatar_url || ""} className="object-cover" />
              <AvatarFallback className="bg-secondary text-sm font-bold">
                {mySnapshot.username?.[0]?.toUpperCase() || "?"}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1 overflow-hidden">
              <p className="truncate text-[14px] font-semibold text-foreground">Toi</p>
              <p className="truncate text-[12px] text-muted-foreground" title={`@${mySnapshot.username}`}>
                @{mySnapshot.username}
              </p>
            </div>
            <div className="min-w-0 shrink-0 text-right">
              <p className="text-[16px] font-bold tabular-nums text-foreground">{mySnapshot.points.toLocaleString()}</p>
              <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">pts</p>
            </div>
          </div>
        </motion.div>
      ) : null}

      <RulesSheet open={showRules} onOpenChange={setShowRules} />

      {showProfilePreview && selectedUserId && (
        <ProfilePreviewDialog userId={selectedUserId} onClose={closeProfilePreview} />
      )}
    </div>
  );
};

export default Leaderboard;
