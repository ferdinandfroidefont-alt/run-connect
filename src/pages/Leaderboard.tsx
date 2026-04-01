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

const getRankRing = (rank: string) => {
  switch (rank) {
    case "diamant":
      return "ring-2 ring-cyan-400";
    case "platine":
      return "ring-2 ring-purple-500";
    case "or":
      return "ring-2 ring-yellow-500";
    case "argent":
      return "ring-2 ring-gray-400";
    case "bronze":
      return "ring-2 ring-amber-600";
    default:
      return "ring-1 ring-border";
  }
};

function PodiumBlock({
  rank,
  user,
  pointsMode,
  maxWidthClass,
  avatarSize,
  onProfile,
}: {
  rank: number;
  user: LeaderboardUser | undefined;
  pointsMode: PointsMode;
  maxWidthClass: string;
  avatarSize: "lg" | "md" | "sm";
  onProfile: () => void;
}) {
  const empty = !user;
  const pts = user ? pointsForMode(user, pointsMode) : 0;
  const av = avatarSize === "lg" ? "h-[72px] w-[72px]" : avatarSize === "md" ? "h-14 w-14" : "h-12 w-12";
  const podiumH = rank === 1 ? "h-[88px]" : rank === 2 ? "h-[64px]" : "h-[52px]";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: rank === 1 ? 0.05 : rank === 2 ? 0 : 0.1 }}
      className={cn("flex min-w-0 flex-1 flex-col items-center", maxWidthClass)}
    >
      <button
        type="button"
        disabled={empty}
        onClick={onProfile}
        className={cn(
          "flex min-w-0 flex-col items-center gap-1.5 rounded-2xl px-1.5 pt-2 transition-opacity",
          empty ? "opacity-40" : "active:opacity-85"
        )}
      >
        <div
          className={cn(
            "relative flex items-center justify-center rounded-full bg-gradient-to-br shadow-lg",
            rank === 1 && "from-amber-400/90 to-amber-600/80 p-[3px]",
            rank === 2 && "from-slate-300/90 to-slate-500/80 p-[2.5px]",
            rank === 3 && "from-amber-700/70 to-orange-800/75 p-[2.5px]"
          )}
        >
          <Avatar className={cn(av, "border-2 border-card shadow-md ring-2 ring-background/80")}>
            <AvatarImage src={user?.profile?.avatar_url} className="object-cover" />
            <AvatarFallback className="text-sm font-bold bg-secondary">
              {user?.profile?.username?.[0]?.toUpperCase() || "—"}
            </AvatarFallback>
          </Avatar>
          <span
            className={cn(
              "absolute -bottom-0.5 -right-0.5 flex h-6 min-w-[24px] items-center justify-center rounded-full border-2 border-card px-1.5 text-[11px] font-bold tabular-nums shadow-sm",
              rank === 1 && "bg-amber-500 text-white",
              rank === 2 && "bg-slate-500 text-white",
              rank === 3 && "bg-orange-700 text-white"
            )}
          >
            {rank}
          </span>
        </div>
        <p className="max-w-full truncate px-0.5 text-center text-[13px] font-semibold leading-tight text-foreground">
          {empty ? "—" : user.profile?.display_name || user.profile?.username}
        </p>
        <p className="text-center text-[14px] font-bold tabular-nums text-primary">
          {empty ? "—" : pts.toLocaleString()} <span className="text-[11px] font-semibold text-muted-foreground">pts</span>
        </p>
      </button>
      <div
        className={cn(
          "mt-2 w-full rounded-t-xl bg-gradient-to-b shadow-inner",
          rank === 1 && "from-amber-500/25 to-amber-600/10",
          rank === 2 && "from-slate-400/25 to-slate-600/10",
          rank === 3 && "from-orange-600/20 to-orange-800/10",
          podiumH
        )}
      />
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
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "ios-card flex w-full min-w-0 items-center gap-3 rounded-[14px] border border-border/60 px-3 py-2.5 text-left transition-colors active:bg-secondary/70",
        isMe && "ring-1 ring-primary/35 bg-primary/[0.07]"
      )}
    >
        <span className="w-8 shrink-0 text-center text-[13px] font-bold tabular-nums text-muted-foreground">#{u.rank}</span>
        <Avatar className={cn("h-10 w-10 shrink-0 shadow-sm", getRankRing(u.user_rank))}>
          <AvatarImage src={u.profile?.avatar_url} className="object-cover" />
          <AvatarFallback className="bg-secondary text-xs font-bold">
            {u.profile?.username?.[0]?.toUpperCase() || "?"}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className={cn("truncate text-[15px] font-semibold leading-tight", isMe && "text-primary")}>
            {u.profile?.display_name || u.profile?.username}
          </p>
          {u.profile?.username ? (
            <p className="truncate text-[12px] text-muted-foreground">@{u.profile.username}</p>
          ) : null}
        </div>
        <div className="shrink-0 text-right">
          <p className="text-[15px] font-bold tabular-nums text-foreground">{pts.toLocaleString()}</p>
          <p className="text-[11px] font-medium text-muted-foreground">pts</p>
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
      <div className="px-1 py-2">
        <LeaderboardSkeleton />
      </div>
    ) : leaderboard.length === 0 ? (
      <div className="flex flex-col items-center px-6 py-12 text-center">
        <Trophy className="mb-2 h-10 w-10 text-muted-foreground/50" />
        <p className="text-[16px] font-semibold text-foreground">Aucun participant</p>
        <p className="mt-1 text-[14px] text-muted-foreground">Reviens plus tard pour voir le classement.</p>
      </div>
    ) : (
      <div className="flex flex-col gap-2 px-1 pb-2">
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
          <div ref={sentinelRef} className="flex justify-center py-5">
            {loadingMore && <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />}
          </div>
        )}
      </div>
    );

  return (
    <div className="fixed-fill-with-bottom-nav flex min-h-0 flex-col bg-secondary">
      <header className="z-20 shrink-0 border-b border-border bg-card pt-[var(--safe-area-top)]">
        <div className="relative flex min-h-[52px] items-center px-4 pb-2 pt-2">
          <button
            type="button"
            onClick={() => navigate("/")}
            className="z-10 flex shrink-0 items-center gap-1 text-primary"
          >
            <ArrowLeft className="h-5 w-5" />
            <span className="text-[15px] font-medium">Retour</span>
          </button>
          <h1 className="pointer-events-none absolute inset-x-10 top-1/2 -translate-y-1/2 truncate text-center text-[17px] font-semibold text-foreground">
            Classement
          </h1>
          <button
            type="button"
            onClick={() => setShowRules(true)}
            className="z-10 ml-auto flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] border border-border bg-card text-primary"
            aria-label="Règles du classement"
          >
            <BookOpen className="h-4 w-4" />
          </button>
        </div>

        <div
          className="scrollbar-none flex gap-2 overflow-x-auto px-4 pb-3 [-webkit-overflow-scrolling:touch]"
          data-tutorial="tutorial-leaderboard"
        >
          {(["season", "total"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setPointsMode(m)}
              className={cn(
                "shrink-0 rounded-[16px] px-5 py-2.5 text-[15px] font-semibold transition-all",
                pointsMode === m
                  ? "bg-foreground text-background shadow-md"
                  : "border border-border/80 bg-card text-foreground active:bg-secondary/80"
              )}
            >
              {modeLabels[m]}
            </button>
          ))}
        </div>

        <p className="px-4 pb-2 text-center text-[12px] text-muted-foreground">
          {totalUsers.toLocaleString()} participant{totalUsers !== 1 ? "s" : ""}
        </p>
      </header>

      <div className="shrink-0 border-b border-border/60 bg-secondary px-4 pb-3 pt-1">
        <div className="mx-auto flex w-full max-w-lg items-end justify-center gap-1.5">
          <PodiumBlock
            rank={2}
            user={u2}
            pointsMode={pointsMode}
            maxWidthClass="max-w-[32%]"
            avatarSize="md"
            onProfile={() => u2 && navigateToProfile(u2.user_id)}
          />
          <PodiumBlock
            rank={1}
            user={u1}
            pointsMode={pointsMode}
            maxWidthClass="max-w-[36%]"
            avatarSize="lg"
            onProfile={() => u1 && navigateToProfile(u1.user_id)}
          />
          <PodiumBlock
            rank={3}
            user={u3}
            pointsMode={pointsMode}
            maxWidthClass="max-w-[32%]"
            avatarSize="md"
            onProfile={() => u3 && navigateToProfile(u3.user_id)}
          />
        </div>
      </div>

      <div
        ref={listScrollRef}
        className={cn(
          "min-h-0 flex-1 overflow-y-auto overscroll-y-contain [-webkit-overflow-scrolling:touch] px-3 pt-3",
          hideBottomMe || !mySnapshot ? "pb-4" : "pb-2"
        )}
      >
        <motion.div
          className="mx-auto w-full max-w-lg"
          initial={{ opacity: 0.88, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
        >
          {listBody}
        </motion.div>
      </div>

      {mySnapshot && !hideBottomMe ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="shrink-0 border-t border-border bg-card/95 px-4 py-2.5 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-4px_24px_-8px_rgba(0,0,0,0.12)] backdrop-blur-md supports-[backdrop-filter]:bg-card/85"
        >
          <div className="mx-auto flex max-w-lg items-center gap-3">
            <span className="shrink-0 text-[13px] font-bold tabular-nums text-primary">#{mySnapshot.rank}</span>
            <Avatar className="h-10 w-10 shrink-0 shadow-sm ring-1 ring-border">
              <AvatarImage src={mySnapshot.avatar_url || ""} className="object-cover" />
              <AvatarFallback className="bg-secondary text-sm font-bold">
                {mySnapshot.username?.[0]?.toUpperCase() || "?"}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[14px] font-semibold text-foreground">Toi</p>
              <p className="truncate text-[12px] text-muted-foreground">
                @{mySnapshot.username}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-[16px] font-bold tabular-nums text-foreground">{mySnapshot.points.toLocaleString()}</p>
              <p className="text-[11px] font-medium text-muted-foreground">pts</p>
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
