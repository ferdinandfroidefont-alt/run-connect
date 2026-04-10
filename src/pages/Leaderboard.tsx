import { useState, useEffect, useRef, useCallback, type Ref } from "react";
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
import { IosFixedPageHeaderShell } from "@/components/layout/IosFixedPageHeaderShell";
import { IosPageHeaderBar } from "@/components/layout/IosPageHeaderBar";
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

function leaderboardPrimaryName(profile: { display_name?: string | null; username?: string | null }): string {
  const un = (profile.username?.trim() || "?").slice(0, 200);
  const dn = profile.display_name?.trim();
  if (!dn) return un;
  if (looksLikeEmail(dn)) return un;
  return dn;
}

const getRankRing = (rank: string) => {
  switch (rank) {
    case "diamant": return "ring-[1.5px] ring-cyan-400/90";
    case "platine": return "ring-[1.5px] ring-purple-500/85";
    case "or": return "ring-[1.5px] ring-amber-400/90";
    case "argent": return "ring-[1.5px] ring-slate-400/90";
    case "bronze": return "ring-[1.5px] ring-amber-700/70";
    default: return "ring-1 ring-border/80";
  }
};

/* ─── Podium ─── */

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

  const avatarSize = rank === 1
    ? "h-[4.25rem] w-[4.25rem]"
    : "h-[3rem] w-[3rem]";

  const pedestalH = rank === 1 ? "h-16" : rank === 2 ? "h-11" : "h-9";

  const medal = rank === 1 ? "🥇" : rank === 2 ? "🥈" : "🥉";

  const tone = rank === 1
    ? {
        ring: "ring-2 ring-amber-400/80",
        pedestal: "bg-gradient-to-b from-amber-100/80 to-amber-50/40 dark:from-amber-900/30 dark:to-amber-950/20",
      }
    : rank === 2
      ? {
          ring: "ring-2 ring-slate-300/80 dark:ring-slate-500/40",
          pedestal: "bg-gradient-to-b from-slate-100/80 to-slate-50/40 dark:from-slate-800/30 dark:to-slate-900/20",
        }
      : {
          ring: "ring-2 ring-orange-300/80 dark:ring-orange-600/40",
          pedestal: "bg-gradient-to-b from-orange-100/70 to-orange-50/30 dark:from-orange-900/25 dark:to-orange-950/15",
        };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: rank === 1 ? 0.05 : rank === 2 ? 0 : 0.1 }}
      className={cn(
        "flex min-w-0 flex-1 flex-col items-center justify-end",
        rank === 1 ? "max-w-[38%]" : "max-w-[31%]"
      )}
    >
      <button
        type="button"
        disabled={empty}
        onClick={onProfile}
        className={cn(
          "group flex min-w-0 flex-col items-center px-1 pb-1 pt-1 transition-opacity",
          empty ? "cursor-default opacity-40" : "active:opacity-80"
        )}
      >
        {/* Avatar + medal */}
        <div className="relative mb-1.5">
          <Avatar className={cn(avatarSize, tone.ring)}>
            <AvatarImage src={user?.profile?.avatar_url} className="object-cover" />
            <AvatarFallback className="bg-secondary text-sm font-semibold">
              {user?.profile?.username?.[0]?.toUpperCase() || "—"}
            </AvatarFallback>
          </Avatar>
          <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-base leading-none">
            {medal}
          </span>
        </div>

        {/* Name + pts */}
        <p
          className="w-full min-w-0 truncate text-center text-[13px] font-semibold leading-tight text-foreground"
          title={empty ? undefined : primary}
        >
          {empty ? "—" : primary}
        </p>
        <p className="mt-0.5 text-center text-[14px] font-bold tabular-nums text-primary">
          {empty ? "—" : pts.toLocaleString()}
          {!empty && <span className="ml-0.5 text-[11px] font-medium text-muted-foreground">pts</span>}
        </p>
      </button>

      {/* Pedestal */}
      <div className={cn(
        "mt-2 w-full rounded-t-lg border-x border-t border-border/30",
        pedestalH,
        tone.pedestal
      )} />
    </motion.div>
  );
}

/* ─── List row ─── */

function LeaderboardListRow({
  u,
  isMe,
  pointsMode,
  onClick,
  rowRef,
}: {
  u: LeaderboardUser;
  isMe: boolean;
  pointsMode: PointsMode;
  onClick: () => void;
  rowRef?: Ref<HTMLButtonElement>;
}) {
  const pts = pointsForMode(u, pointsMode);
  const primary = leaderboardPrimaryName(u.profile);
  const un = u.profile?.username?.trim() || "";

  return (
    <button
      ref={rowRef}
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full min-w-0 items-center gap-3 bg-card px-4 py-3 text-left transition-colors active:bg-secondary/80",
        "border-b border-border/40 last:border-b-0",
        isMe && "bg-primary/[0.05]"
      )}
    >
      {/* Rank */}
      <span className={cn(
        "w-8 shrink-0 text-center text-[13px] font-bold tabular-nums",
        isMe ? "text-primary" : "text-muted-foreground"
      )}>
        {u.rank}
      </span>

      {/* Avatar */}
      <Avatar className={cn("h-11 w-11 shrink-0", getRankRing(u.user_rank))}>
        <AvatarImage src={u.profile?.avatar_url} className="object-cover" />
        <AvatarFallback className="bg-secondary text-xs font-bold">
          {u.profile?.username?.[0]?.toUpperCase() || "?"}
        </AvatarFallback>
      </Avatar>

      {/* Name */}
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
        {un && (
          <p className="min-w-0 truncate text-[12px] leading-snug text-muted-foreground" title={`@${un}`}>
            @{un}
          </p>
        )}
      </div>

      {/* Points */}
      <div className="min-w-0 shrink-0 text-right">
        <p className="text-[15px] font-bold tabular-nums text-foreground">{pts.toLocaleString()}</p>
        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">pts</p>
      </div>
    </button>
  );
}

/* ─── Main ─── */

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

  const scrollRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const meRowRef = useRef<HTMLButtonElement>(null);

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
  }, [user, pointsMode]);

  useEffect(() => {
    if (!user || currentPage <= 1) return;
    void fetchLeaderboard(currentPage);
  }, [currentPage]);

  const topThree = leaderboard.filter((u) => u.rank <= 3);
  const u1 = topThree.find((u) => u.rank === 1);
  const u2 = topThree.find((u) => u.rank === 2);
  const u3 = topThree.find((u) => u.rank === 3);
  const listFromRank4 = leaderboard.filter((u) => u.rank > 3);

  const hideBottomMe =
    (mySnapshot !== null && mySnapshot.rank <= 3) || (mySnapshot !== null && mySnapshot.rank > 3 && meRowInView);

  useEffect(() => {
    const root = scrollRef.current;
    const el = meRowRef.current;
    if (!root || !el || !user || !mySnapshot || mySnapshot.rank <= 3) {
      setMeRowInView(false);
      return;
    }
    const obs = new IntersectionObserver(
      ([entry]) => setMeRowInView(entry.isIntersecting),
      { root, threshold: 0.2, rootMargin: "-8px 0px -64px 0px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [user, mySnapshot, listFromRank4.length, leaderboard.length]);

  useEffect(() => {
    const el = sentinelRef.current;
    const root = scrollRef.current;
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

  /* ─── Header ─── */

  const headerContent = (
    <div className="border-b border-border/60 bg-card">
      <IosPageHeaderBar
        left={
          <button
            type="button"
            onClick={() => navigate("/")}
            className="flex items-center gap-1 text-primary"
          >
            <ArrowLeft className="h-5 w-5" />
            <span className="text-[15px] font-medium">Retour</span>
          </button>
        }
        title="Classement"
        right={
          <button
            type="button"
            onClick={() => setShowRules(true)}
            className="flex h-9 w-9 items-center justify-center rounded-full text-primary active:bg-secondary"
            aria-label="Règles du classement"
          >
            <BookOpen className="h-[18px] w-[18px]" />
          </button>
        }
      />

      {/* Segmented control */}
      <div className="px-4 pb-3" data-tutorial="tutorial-leaderboard">
        <div className="mx-auto flex max-w-xs rounded-[10px] bg-secondary p-[3px]">
          {(["season", "total"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setPointsMode(m)}
              className={cn(
                "min-w-0 flex-1 rounded-[8px] py-[7px] text-[13px] font-semibold transition-all",
                pointsMode === m
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground active:text-foreground"
              )}
            >
              {modeLabels[m]}
            </button>
          ))}
        </div>
      </div>

      {/* Participants count */}
      <p className="pb-2.5 text-center text-[12px] font-medium text-muted-foreground">
        {totalUsers.toLocaleString()} participant{totalUsers !== 1 ? "s" : ""}
      </p>
    </div>
  );

  /* ─── Footer: sticky "me" bar ─── */

  const footerContent = mySnapshot && !hideBottomMe ? (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="border-t border-border/60 bg-card px-4 py-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))]"
    >
      <div className="mx-auto flex min-w-0 max-w-lg items-center gap-3">
        <span className="w-8 shrink-0 text-center text-[13px] font-bold tabular-nums text-primary">
          #{mySnapshot.rank}
        </span>
        <Avatar className="h-10 w-10 shrink-0 ring-1 ring-border/60">
          <AvatarImage src={mySnapshot.avatar_url || ""} className="object-cover" />
          <AvatarFallback className="bg-secondary text-sm font-bold">
            {mySnapshot.username?.[0]?.toUpperCase() || "?"}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1 overflow-hidden">
          <p className="truncate text-[14px] font-semibold text-foreground">Toi</p>
          <p className="truncate text-[12px] text-muted-foreground">@{mySnapshot.username}</p>
        </div>
        <div className="min-w-0 shrink-0 text-right">
          <p className="text-[15px] font-bold tabular-nums text-foreground">{mySnapshot.points.toLocaleString()}</p>
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">pts</p>
        </div>
      </div>
    </motion.div>
  ) : null;

  /* ─── Content ─── */

  const listBody = loading && leaderboard.length === 0 ? (
    <div className="px-4 py-3">
      <LeaderboardSkeleton />
    </div>
  ) : leaderboard.length === 0 ? (
    <div className="flex flex-col items-center px-6 py-16 text-center">
      <Trophy className="mb-3 h-10 w-10 text-muted-foreground/40" />
      <p className="text-[17px] font-semibold text-foreground">Aucun participant</p>
      <p className="mt-1 text-[14px] text-muted-foreground">Reviens plus tard pour voir le classement.</p>
    </div>
  ) : (
    <>
      {/* List from rank 4+ */}
      <div className="overflow-hidden rounded-xl bg-card mx-4">
        {listFromRank4.map((u) => {
          const isMe = u.user_id === user?.id;
          return (
            <LeaderboardListRow
              key={u.user_id}
              rowRef={isMe ? meRowRef : undefined}
              u={u}
              isMe={isMe}
              pointsMode={pointsMode}
              onClick={() => navigateToProfile(u.user_id)}
            />
          );
        })}
      </div>
      {hasMoreUsers && (
        <div ref={sentinelRef} className="flex justify-center py-5">
          {loadingMore && (
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          )}
        </div>
      )}
    </>
  );

  return (
    <div className="fixed-fill-with-bottom-nav flex min-h-0 flex-col bg-secondary">
      <IosFixedPageHeaderShell
        className="min-h-0 flex-1"
        header={headerContent}
        footer={footerContent}
        contentScroll
      >
        {/* Podium — fixed above scroll */}
        <div className="shrink-0 bg-secondary px-4 pb-3 pt-3">
          <div className="mx-auto w-full max-w-sm">
            <p className="mb-3 text-center text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              Podium
            </p>
            <div className="flex min-w-0 items-end justify-center gap-2">
              <PodiumBlock rank={2} user={u2} pointsMode={pointsMode} onProfile={() => u2 && navigateToProfile(u2.user_id)} />
              <PodiumBlock rank={1} user={u1} pointsMode={pointsMode} onProfile={() => u1 && navigateToProfile(u1.user_id)} />
              <PodiumBlock rank={3} user={u3} pointsMode={pointsMode} onProfile={() => u3 && navigateToProfile(u3.user_id)} />
            </div>
          </div>
        </div>

        {/* Scrollable list */}
        <div
          ref={scrollRef}
          className={cn(
            "min-h-0 flex-1 overflow-y-auto overscroll-y-contain [-webkit-overflow-scrolling:touch] pb-4 pt-1",
          )}
        >
          {listBody}
        </div>
      </IosFixedPageHeaderShell>

      <RulesSheet open={showRules} onOpenChange={setShowRules} />

      {showProfilePreview && selectedUserId && (
        <ProfilePreviewDialog userId={selectedUserId} onClose={closeProfilePreview} />
      )}
    </div>
  );
};

export default Leaderboard;
